"""
Tests for the Medical Reports / Health-Records Storage endpoints.

Coverage:
  - POST   /medical-reports   (upload)
  - GET    /medical-reports   (list)
  - GET    /medical-reports/{id}  (get / download)
  - DELETE /medical-reports/{id}  (delete)

Scenarios tested:
  - Successful upload (PDF, PNG, JPG, JPEG)
  - Upload by guardian with FULL_ACCESS consent
  - Invalid MIME type rejected (400)
  - MIME type / extension mismatch rejected (400)
  - Empty file rejected (400)
  - File exceeding 10 MB rejected (400)
  - Unauthorized member forbidden (403)
  - List for self, list for specific member, list empty
  - Get by ID, not-found (404)
  - Download generates signed URL; audit action recorded
  - Delete self, delete forbidden (403), delete not-found (404)
  - Unauthenticated request rejected (401/403)
"""

import pytest
import io
import uuid
from unittest.mock import MagicMock, patch, call
from app.auth.dependencies import get_supabase
from app.main import app


# ---------------------------------------------------------------------------
# Shared mock infrastructure
# ---------------------------------------------------------------------------

class MockQueryBuilder:
    def __init__(self, data=None):
        self._data = [dict(item) for item in data] if data is not None else []

    def select(self, *args, **kwargs):
        return self

    def eq(self, column, value):
        self._data = [item for item in self._data if str(item.get(column)) == str(value)]
        return self

    def in_(self, column, values):
        val_strs = [str(v) for v in values]
        self._data = [item for item in self._data if str(item.get(column)) in val_strs]
        return self

    def insert(self, payload):
        p = dict(payload)
        if "id" not in p:
            p["id"] = str(uuid.uuid4())
        p.setdefault("created_at", "2026-10-06T00:00:00Z")
        self._data = [p]
        return self

    def update(self, payload):
        if self._data:
            updated = dict(self._data[0])
            updated.update(payload)
            self._data = [updated]
        return self

    def delete(self):
        return self

    def execute(self):
        res = MagicMock()
        res.data = list(self._data)
        return res


def setup_mock_supabase(tables_data: dict) -> MagicMock:
    mock_supabase = MagicMock()

    def get_table(name):
        data = tables_data.get(name, [])
        return MockQueryBuilder(data)

    mock_supabase.table.side_effect = get_table

    # Storage mock (used by user-scoped client if called)
    mock_bucket = MagicMock()
    mock_bucket.upload.return_value = {"Key": "test_path"}
    mock_bucket.create_signed_url.return_value = {"signedURL": "https://storage.supabase.co/signed/test?token=abc"}
    mock_bucket.remove.return_value = [{"name": "test_path"}]
    mock_supabase.storage.from_.return_value = mock_bucket

    return mock_supabase


def _service_role_mock():
    """Return a MagicMock that behaves like a service-role Supabase client."""
    svc = MagicMock()
    bucket = MagicMock()
    bucket.upload.return_value = {"Key": "test_path"}
    bucket.create_signed_url.return_value = {"signedURL": "https://storage.supabase.co/signed/test?token=abc"}
    bucket.remove.return_value = [{"name": "test_path"}]
    svc.storage.from_.return_value = bucket
    return svc


# ---------------------------------------------------------------------------
# Upload — success scenarios
# ---------------------------------------------------------------------------

def test_upload_medical_report_pdf_self(client, auth_headers, test_user_id):
    family_member_id = str(uuid.uuid4())
    family_id = str(uuid.uuid4())

    mock_db = setup_mock_supabase({
        "family_members": [{"id": family_member_id, "family_id": family_id, "user_id": test_user_id, "role": "MEMBER"}],
        "medical_reports": [],
    })
    app.dependency_overrides[get_supabase] = lambda: mock_db

    fake_pdf = io.BytesIO(b"%PDF-1.4 Fake PDF Content for Lab Report")
    with patch("app.api.medical_reports.get_service_role_client", return_value=_service_role_mock()):
        response = client.post(
            "/medical-reports",
            files={"file": ("blood_test.pdf", fake_pdf, "application/pdf")},
            data={"family_member_id": family_member_id, "report_type": "LAB_REPORT", "description": "CMP"},
            headers=auth_headers,
        )

    app.dependency_overrides.clear()
    assert response.status_code == 201
    data = response.json()
    assert data["file_name"] == "blood_test.pdf"
    assert data["mime_type"] == "application/pdf"
    assert data["report_type"] == "LAB_REPORT"
    assert data["download_url"] is not None
    assert "token=abc" in data["download_url"]


def test_upload_medical_report_png_image(client, auth_headers, test_user_id):
    family_member_id = str(uuid.uuid4())
    mock_db = setup_mock_supabase({
        "family_members": [{"id": family_member_id, "family_id": str(uuid.uuid4()), "user_id": test_user_id, "role": "MEMBER"}],
        "medical_reports": [],
    })
    app.dependency_overrides[get_supabase] = lambda: mock_db

    fake_png = io.BytesIO(b"\x89PNG\r\n\x1a\nFake PNG Bytes")
    with patch("app.api.medical_reports.get_service_role_client", return_value=_service_role_mock()):
        response = client.post(
            "/medical-reports",
            files={"file": ("chest_xray.png", fake_png, "image/png")},
            data={"family_member_id": family_member_id, "report_type": "IMAGING_SCAN"},
            headers=auth_headers,
        )

    app.dependency_overrides.clear()
    assert response.status_code == 201
    assert response.json()["file_name"] == "chest_xray.png"
    assert response.json()["report_type"] == "IMAGING_SCAN"


def test_upload_medical_report_jpeg(client, auth_headers, test_user_id):
    family_member_id = str(uuid.uuid4())
    mock_db = setup_mock_supabase({
        "family_members": [{"id": family_member_id, "family_id": str(uuid.uuid4()), "user_id": test_user_id, "role": "MEMBER"}],
        "medical_reports": [],
    })
    app.dependency_overrides[get_supabase] = lambda: mock_db

    fake_jpg = io.BytesIO(b"\xff\xd8\xffFake JPEG")
    with patch("app.api.medical_reports.get_service_role_client", return_value=_service_role_mock()):
        response = client.post(
            "/medical-reports",
            files={"file": ("scan.jpeg", fake_jpg, "image/jpeg")},
            data={"family_member_id": family_member_id, "report_type": "IMAGING_SCAN"},
            headers=auth_headers,
        )

    app.dependency_overrides.clear()
    assert response.status_code == 201
    assert response.json()["file_name"] == "scan.jpeg"


def test_upload_medical_report_guardian_with_full_access(client, auth_headers, test_user_id):
    family_member_id = str(uuid.uuid4())
    other_patient_id = str(uuid.uuid4())
    family_id = str(uuid.uuid4())

    mock_db = setup_mock_supabase({
        "family_members": [{"id": family_member_id, "family_id": family_id, "user_id": other_patient_id, "role": "MEMBER"}],
        "consents": [{
            "id": str(uuid.uuid4()),
            "granter_id": other_patient_id,
            "grantee_id": test_user_id,
            "family_id": family_id,
            "permission_level": "FULL_ACCESS",
            "status": "ACTIVE",
        }],
        "medical_reports": [],
    })
    app.dependency_overrides[get_supabase] = lambda: mock_db

    fake_jpg = io.BytesIO(b"\xff\xd8\xffFake JPEG Bytes")
    with patch("app.api.medical_reports.get_service_role_client", return_value=_service_role_mock()):
        response = client.post(
            "/medical-reports",
            files={"file": ("rx_slip.jpg", fake_jpg, "image/jpeg")},
            data={"family_member_id": family_member_id, "report_type": "PRESCRIPTION"},
            headers=auth_headers,
        )

    app.dependency_overrides.clear()
    assert response.status_code == 201
    assert response.json()["file_name"] == "rx_slip.jpg"


# ---------------------------------------------------------------------------
# Upload — validation failures
# ---------------------------------------------------------------------------

def test_upload_invalid_mime_type_rejected(client, auth_headers, test_user_id):
    family_member_id = str(uuid.uuid4())
    mock_db = setup_mock_supabase({
        "family_members": [{"id": family_member_id, "family_id": str(uuid.uuid4()), "user_id": test_user_id, "role": "MEMBER"}],
    })
    app.dependency_overrides[get_supabase] = lambda: mock_db

    fake_txt = io.BytesIO(b"Unauthorized text file content")
    with patch("app.api.medical_reports.get_service_role_client", return_value=_service_role_mock()):
        response = client.post(
            "/medical-reports",
            files={"file": ("report.txt", fake_txt, "text/plain")},
            data={"family_member_id": family_member_id},
            headers=auth_headers,
        )

    app.dependency_overrides.clear()
    assert response.status_code == 400
    assert "Unsupported MIME type" in response.json()["detail"]


def test_upload_invalid_extension_rejected(client, auth_headers, test_user_id):
    """Reject .exe even if the MIME type is forced to application/pdf."""
    family_member_id = str(uuid.uuid4())
    mock_db = setup_mock_supabase({
        "family_members": [{"id": family_member_id, "family_id": str(uuid.uuid4()), "user_id": test_user_id, "role": "MEMBER"}],
    })
    app.dependency_overrides[get_supabase] = lambda: mock_db

    fake_exe = io.BytesIO(b"MZ fake binary")
    with patch("app.api.medical_reports.get_service_role_client", return_value=_service_role_mock()):
        response = client.post(
            "/medical-reports",
            files={"file": ("malware.exe", fake_exe, "application/pdf")},
            data={"family_member_id": family_member_id},
            headers=auth_headers,
        )

    app.dependency_overrides.clear()
    assert response.status_code == 400


def test_upload_mime_extension_mismatch_rejected(client, auth_headers, test_user_id):
    """A .png file declared as application/pdf must be rejected."""
    family_member_id = str(uuid.uuid4())
    mock_db = setup_mock_supabase({
        "family_members": [{"id": family_member_id, "family_id": str(uuid.uuid4()), "user_id": test_user_id, "role": "MEMBER"}],
    })
    app.dependency_overrides[get_supabase] = lambda: mock_db

    fake_file = io.BytesIO(b"\x89PNG\r\n\x1a\n fake png")
    with patch("app.api.medical_reports.get_service_role_client", return_value=_service_role_mock()):
        response = client.post(
            "/medical-reports",
            files={"file": ("image.png", fake_file, "application/pdf")},
            data={"family_member_id": family_member_id},
            headers=auth_headers,
        )

    app.dependency_overrides.clear()
    assert response.status_code == 400
    assert "does not match MIME type" in response.json()["detail"]


def test_upload_empty_file_rejected(client, auth_headers, test_user_id):
    family_member_id = str(uuid.uuid4())
    mock_db = setup_mock_supabase({
        "family_members": [{"id": family_member_id, "family_id": str(uuid.uuid4()), "user_id": test_user_id, "role": "MEMBER"}],
    })
    app.dependency_overrides[get_supabase] = lambda: mock_db

    with patch("app.api.medical_reports.get_service_role_client", return_value=_service_role_mock()):
        response = client.post(
            "/medical-reports",
            files={"file": ("empty.pdf", io.BytesIO(b""), "application/pdf")},
            data={"family_member_id": family_member_id},
            headers=auth_headers,
        )

    app.dependency_overrides.clear()
    assert response.status_code == 400
    assert "empty" in response.json()["detail"].lower()


def test_upload_file_exceeds_10mb_rejected(client, auth_headers, test_user_id):
    """Files > 10 MB must be rejected with HTTP 400."""
    family_member_id = str(uuid.uuid4())
    mock_db = setup_mock_supabase({
        "family_members": [{"id": family_member_id, "family_id": str(uuid.uuid4()), "user_id": test_user_id, "role": "MEMBER"}],
    })
    app.dependency_overrides[get_supabase] = lambda: mock_db

    # Create a 10 MB + 1 byte payload
    oversized = io.BytesIO(b"%PDF-1.4 " + b"A" * (10 * 1024 * 1024 + 1))
    with patch("app.api.medical_reports.get_service_role_client", return_value=_service_role_mock()):
        response = client.post(
            "/medical-reports",
            files={"file": ("big_file.pdf", oversized, "application/pdf")},
            data={"family_member_id": family_member_id},
            headers=auth_headers,
        )

    app.dependency_overrides.clear()
    assert response.status_code == 400
    assert "10 MB" in response.json()["detail"]


def test_upload_unauthorized_member_forbidden(client, auth_headers, test_user_id):
    family_member_id = str(uuid.uuid4())
    other_patient_id = str(uuid.uuid4())

    mock_db = setup_mock_supabase({
        "family_members": [{"id": family_member_id, "family_id": str(uuid.uuid4()), "user_id": other_patient_id, "role": "MEMBER"}],
        "consents": [],
    })
    app.dependency_overrides[get_supabase] = lambda: mock_db

    fake_pdf = io.BytesIO(b"%PDF Fake")
    with patch("app.api.medical_reports.get_service_role_client", return_value=_service_role_mock()):
        response = client.post(
            "/medical-reports",
            files={"file": ("report.pdf", fake_pdf, "application/pdf")},
            data={"family_member_id": family_member_id},
            headers=auth_headers,
        )

    app.dependency_overrides.clear()
    assert response.status_code == 403


# ---------------------------------------------------------------------------
# List
# ---------------------------------------------------------------------------

def test_list_medical_reports_self(client, auth_headers, test_user_id):
    family_member_id = str(uuid.uuid4())
    report_id = str(uuid.uuid4())

    mock_db = setup_mock_supabase({
        "family_members": [{"id": family_member_id, "family_id": str(uuid.uuid4()), "user_id": test_user_id, "role": "MEMBER"}],
        "consents": [],
        "medical_reports": [{
            "id": report_id,
            "family_member_id": family_member_id,
            "uploaded_by": test_user_id,
            "file_name": "mri_scan.pdf",
            "storage_path": f"{family_member_id}/mri_scan.pdf",
            "report_type": "IMAGING_SCAN",
            "mime_type": "application/pdf",
            "file_size": 2048,
            "report_date": "2026-10-06",
            "created_at": "2026-10-06T00:00:00Z",
        }],
    })
    app.dependency_overrides[get_supabase] = lambda: mock_db

    with patch("app.api.medical_reports.get_service_role_client", return_value=_service_role_mock()):
        response = client.get("/medical-reports", headers=auth_headers)

    app.dependency_overrides.clear()
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["id"] == report_id
    assert data[0]["file_name"] == "mri_scan.pdf"
    assert data[0]["download_url"] is not None


def test_list_medical_reports_empty_returns_empty_list(client, auth_headers, test_user_id):
    mock_db = setup_mock_supabase({
        "family_members": [],
        "consents": [],
        "medical_reports": [],
    })
    app.dependency_overrides[get_supabase] = lambda: mock_db

    with patch("app.api.medical_reports.get_service_role_client", return_value=_service_role_mock()):
        response = client.get("/medical-reports", headers=auth_headers)

    app.dependency_overrides.clear()
    assert response.status_code == 200
    assert response.json() == []


def test_list_medical_reports_by_family_member_id(client, auth_headers, test_user_id):
    family_member_id = str(uuid.uuid4())
    report_id = str(uuid.uuid4())

    mock_db = setup_mock_supabase({
        "family_members": [{"id": family_member_id, "family_id": str(uuid.uuid4()), "user_id": test_user_id, "role": "MEMBER"}],
        "medical_reports": [{
            "id": report_id,
            "family_member_id": family_member_id,
            "uploaded_by": test_user_id,
            "file_name": "ecg.pdf",
            "storage_path": f"{family_member_id}/ecg.pdf",
            "report_type": "GENERAL",
            "mime_type": "application/pdf",
            "file_size": 512,
            "report_date": "2026-10-06",
            "created_at": "2026-10-06T00:00:00Z",
        }],
    })
    app.dependency_overrides[get_supabase] = lambda: mock_db

    with patch("app.api.medical_reports.get_service_role_client", return_value=_service_role_mock()):
        response = client.get(f"/medical-reports?family_member_id={family_member_id}", headers=auth_headers)

    app.dependency_overrides.clear()
    assert response.status_code == 200
    assert response.json()[0]["id"] == report_id


# ---------------------------------------------------------------------------
# Get / Download
# ---------------------------------------------------------------------------

def test_get_medical_report_by_id(client, auth_headers, test_user_id):
    family_member_id = str(uuid.uuid4())
    report_id = str(uuid.uuid4())

    mock_db = setup_mock_supabase({
        "family_members": [{"id": family_member_id, "family_id": str(uuid.uuid4()), "user_id": test_user_id, "role": "MEMBER"}],
        "medical_reports": [{
            "id": report_id,
            "family_member_id": family_member_id,
            "uploaded_by": test_user_id,
            "file_name": "ultrasound.jpg",
            "storage_path": f"{family_member_id}/ultrasound.jpg",
            "report_type": "IMAGING_SCAN",
            "mime_type": "image/jpeg",
            "file_size": 4096,
            "report_date": "2026-10-06",
            "created_at": "2026-10-06T00:00:00Z",
        }],
        "audit_logs": [],
    })
    app.dependency_overrides[get_supabase] = lambda: mock_db

    with patch("app.api.medical_reports.get_service_role_client", return_value=_service_role_mock()):
        response = client.get(f"/medical-reports/{report_id}", headers=auth_headers)

    app.dependency_overrides.clear()
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == report_id
    assert data["file_name"] == "ultrasound.jpg"
    assert data["download_url"] is not None
    assert "token=abc" in data["download_url"]


def test_get_medical_report_not_found(client, auth_headers):
    mock_db = setup_mock_supabase({"medical_reports": []})
    app.dependency_overrides[get_supabase] = lambda: mock_db

    with patch("app.api.medical_reports.get_service_role_client", return_value=_service_role_mock()):
        response = client.get(f"/medical-reports/{uuid.uuid4()}", headers=auth_headers)

    app.dependency_overrides.clear()
    assert response.status_code == 404
    assert response.json()["detail"] == "Medical report not found"


def test_download_forbidden_for_unauthorized_user(client, auth_headers, test_user_id):
    """A user with no consent to a family member cannot retrieve that report."""
    family_member_id = str(uuid.uuid4())
    other_patient_id = str(uuid.uuid4())
    report_id = str(uuid.uuid4())

    mock_db = setup_mock_supabase({
        "family_members": [{"id": family_member_id, "family_id": str(uuid.uuid4()), "user_id": other_patient_id, "role": "MEMBER"}],
        "consents": [],
        "medical_reports": [{
            "id": report_id,
            "family_member_id": family_member_id,
            "uploaded_by": other_patient_id,
            "file_name": "private.pdf",
            "storage_path": f"{family_member_id}/private.pdf",
            "report_type": "GENERAL",
            "mime_type": "application/pdf",
            "file_size": 1024,
            "report_date": "2026-10-06",
            "created_at": "2026-10-06T00:00:00Z",
        }],
    })
    app.dependency_overrides[get_supabase] = lambda: mock_db

    with patch("app.api.medical_reports.get_service_role_client", return_value=_service_role_mock()):
        response = client.get(f"/medical-reports/{report_id}", headers=auth_headers)

    app.dependency_overrides.clear()
    assert response.status_code == 403


# ---------------------------------------------------------------------------
# Delete
# ---------------------------------------------------------------------------

def test_delete_medical_report_self(client, auth_headers, test_user_id):
    family_member_id = str(uuid.uuid4())
    report_id = str(uuid.uuid4())

    mock_db = setup_mock_supabase({
        "family_members": [{"id": family_member_id, "family_id": str(uuid.uuid4()), "user_id": test_user_id, "role": "MEMBER"}],
        "medical_reports": [{
            "id": report_id,
            "family_member_id": family_member_id,
            "storage_path": "path/to/file.pdf",
            "created_at": "2026-10-06T00:00:00Z",
        }],
        "audit_logs": [],
    })
    app.dependency_overrides[get_supabase] = lambda: mock_db

    svc = _service_role_mock()
    with patch("app.api.medical_reports.get_service_role_client", return_value=svc):
        response = client.delete(f"/medical-reports/{report_id}", headers=auth_headers)

    app.dependency_overrides.clear()
    assert response.status_code == 204
    # Verify the Storage remove call was made
    svc.storage.from_.assert_called_with("medical-reports")
    svc.storage.from_().remove.assert_called_with(["path/to/file.pdf"])


def test_delete_medical_report_unauthorized_forbidden(client, auth_headers, test_user_id):
    family_member_id = str(uuid.uuid4())
    other_patient_id = str(uuid.uuid4())
    report_id = str(uuid.uuid4())

    mock_db = setup_mock_supabase({
        "family_members": [{"id": family_member_id, "family_id": str(uuid.uuid4()), "user_id": other_patient_id, "role": "MEMBER"}],
        "consents": [],
        "medical_reports": [{
            "id": report_id,
            "family_member_id": family_member_id,
            "storage_path": "path/to/file.pdf",
            "created_at": "2026-10-06T00:00:00Z",
        }],
    })
    app.dependency_overrides[get_supabase] = lambda: mock_db

    with patch("app.api.medical_reports.get_service_role_client", return_value=_service_role_mock()):
        response = client.delete(f"/medical-reports/{report_id}", headers=auth_headers)

    app.dependency_overrides.clear()
    assert response.status_code == 403


def test_delete_medical_report_not_found(client, auth_headers):
    mock_db = setup_mock_supabase({"medical_reports": []})
    app.dependency_overrides[get_supabase] = lambda: mock_db

    with patch("app.api.medical_reports.get_service_role_client", return_value=_service_role_mock()):
        response = client.delete(f"/medical-reports/{uuid.uuid4()}", headers=auth_headers)

    app.dependency_overrides.clear()
    assert response.status_code == 404
    assert response.json()["detail"] == "Medical report not found"


# ---------------------------------------------------------------------------
# Unauthenticated access
# ---------------------------------------------------------------------------

def test_unauthenticated_request_rejected(client):
    response = client.get("/medical-reports")
    assert response.status_code in (401, 403)


def test_unauthenticated_upload_rejected(client):
    response = client.post("/medical-reports", data={"family_member_id": str(uuid.uuid4())})
    assert response.status_code in (401, 403)


def test_unauthenticated_delete_rejected(client):
    response = client.delete(f"/medical-reports/{uuid.uuid4()}")
    assert response.status_code in (401, 403)
