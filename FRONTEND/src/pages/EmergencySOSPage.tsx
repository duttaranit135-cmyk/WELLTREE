import React, { useState, useEffect, useRef } from 'react';
import { AlertTriangle, MapPin, Battery, Clock, Navigation, Phone, ExternalLink, Radio } from 'lucide-react';
import { useFamily } from '../context/FamilyContext';
import { emergencyService } from '../lib/services/emergencyService';
import type { EmergencySOS, SOSEventCreate } from '../types';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

export const EmergencySOSPage: React.FC = () => {
  const { activeMember } = useFamily();
  const [isHolding, setIsHolding] = useState<boolean>(false);
  const [holdProgress, setHoldProgress] = useState<number>(0);
  const [isTriggered, setIsTriggered] = useState<boolean>(false);
  const [activeSOS, setActiveSOS] = useState<EmergencySOS | null>(null);
  const [locationStatus, setLocationStatus] = useState<string>('Ready');
  const [coords, setCoords] = useState<{ lat: number; lng: number; acc: number } | null>(null);
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null);
  const [notes, setNotes] = useState<string>('');

  const progressIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        setBatteryLevel(Math.round(battery.level * 100));
      }).catch(() => null);
    }
  }, []);

  const startHold = () => {
    if (isTriggered) return;
    setIsHolding(true);
    setHoldProgress(0);

    const startTime = Date.now();
    const duration = 3000;

    progressIntervalRef.current = window.setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min((elapsed / duration) * 100, 100);
      setHoldProgress(progress);

      if (progress >= 100) {
        clearInterval(progressIntervalRef.current!);
        triggerEmergencySOS();
      }
    }, 50);
  };

  const cancelHold = () => {
    if (holdProgress < 100) {
      setIsHolding(false);
      setHoldProgress(0);
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    }
  };

  const triggerEmergencySOS = async () => {
    setIsHolding(false);
    setIsTriggered(true);

    if (!activeMember) {
      toast.error('No active family member selected');
      setIsTriggered(false);
      return;
    }

    setLocationStatus('Acquiring precise GPS coordinates...');

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          const acc = position.coords.accuracy;
          setCoords({ lat, lng, acc });
          setLocationStatus('GPS Coordinates Locked');
          await sendSOSToBackend(lat, lng, acc);
        },
        async (err) => {
          console.warn('Geolocation failed:', err);
          setLocationStatus('GPS Unavailable: Dispatching without coordinates');
          await sendSOSToBackend(undefined, undefined, undefined);
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    } else {
      await sendSOSToBackend(undefined, undefined, undefined);
    }
  };

  const sendSOSToBackend = async (lat?: number, lng?: number, acc?: number) => {
    try {
      const sosData: SOSEventCreate = {
        family_member_id: activeMember!.id,
        latitude: lat,
        longitude: lng,
        accuracy: acc,
        notes: notes || 'Immediate Emergency SOS triggered by user.',
      };

      const result = await emergencyService.triggerSOS(sosData);
      setActiveSOS(result);
      toast.success('Emergency SOS broadcast dispatched to all guardians!', {
        duration: 8000,
      });
    } catch (err: any) {
      toast.error(err.message || 'Failed to dispatch SOS alert');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-rose-600 font-semibold text-sm">
            <Radio className="w-4 h-4 animate-pulse" />
            <span>Crisis Geolocation Dispatch</span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
            Emergency SOS Portal
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Hold for 3 seconds to immediately broadcast your location and distress beacon to family guardians.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link to="/emergency-contacts">
            <Button variant="outline" className="border-slate-200">
              <Phone className="w-4 h-4 mr-2" />
              Contacts Roster
            </Button>
          </Link>
          <Link to="/emergency/sos/history">
            <Button variant="outline" className="border-slate-200">
              <Clock className="w-4 h-4 mr-2" />
              Incident History
            </Button>
          </Link>
        </div>
      </div>

      <Card className="p-8 md:p-12 text-center bg-gradient-to-b from-white via-rose-50/20 to-rose-50/40 border-rose-200/80 shadow-lg relative overflow-hidden">
        <div className="max-w-md mx-auto space-y-8">
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-slate-900">
              {isTriggered ? 'SOS DISTRESS BEACON ACTIVE' : '3-Second Safety Trigger'}
            </h2>
            <p className="text-xs text-slate-500">
              {isTriggered
                ? 'Your guardians have been alerted with real-time GPS telemetry.'
                : 'Press and hold the button below. Release before 3 seconds to cancel.'}
            </p>
          </div>

          <div className="relative inline-flex items-center justify-center">
            <svg className="w-56 h-56 -rotate-90">
              <circle
                cx="112"
                cy="112"
                r="100"
                stroke="currentColor"
                strokeWidth="10"
                className="text-slate-200"
                fill="transparent"
              />
              <circle
                cx="112"
                cy="112"
                r="100"
                stroke="currentColor"
                strokeWidth="10"
                className="text-rose-600 transition-all duration-75 ease-linear"
                fill="transparent"
                strokeDasharray={2 * Math.PI * 100}
                strokeDashoffset={2 * Math.PI * 100 * (1 - holdProgress / 100)}
                strokeLinecap="round"
              />
            </svg>

            <button
              onMouseDown={startHold}
              onMouseUp={cancelHold}
              onMouseLeave={cancelHold}
              onTouchStart={startHold}
              onTouchEnd={cancelHold}
              disabled={isTriggered}
              className={`absolute w-44 h-44 rounded-full flex flex-col items-center justify-center font-black text-white shadow-2xl transition-all select-none ${
                isTriggered
                  ? 'bg-rose-700 cursor-default animate-pulse'
                  : isHolding
                  ? 'bg-rose-700 scale-95 ring-8 ring-rose-400/40'
                  : 'bg-rose-600 hover:bg-rose-700 hover:scale-105 active:scale-95 cursor-pointer shadow-rose-600/30 ring-4 ring-rose-200'
              }`}
            >
              <AlertTriangle className="w-12 h-12 mb-1 drop-shadow-md" />
              <span className="text-2xl tracking-widest">SOS</span>
              <span className="text-2xs font-medium tracking-normal opacity-90">
                {isHolding ? `${Math.round(holdProgress)}%` : isTriggered ? 'SENT' : 'HOLD 3s'}
              </span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex items-center gap-2 text-slate-600">
              <Navigation className="w-4 h-4 text-teal-600" />
              <span className="truncate">{locationStatus}</span>
            </div>
            <div className="flex items-center justify-end gap-2 text-slate-600">
              <Battery className="w-4 h-4 text-emerald-600" />
              <span>{batteryLevel !== null ? `Battery: ${batteryLevel}%` : 'Battery Normal'}</span>
            </div>
          </div>

          {activeSOS && (
            <div className="p-5 bg-white border border-rose-300 rounded-xl text-left shadow-sm space-y-3 animate-fade-in">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-rose-700 uppercase tracking-wider">
                  Beacon Dispatched
                </span>
                <Badge variant="red" className="animate-pulse">
                  ACTIVE SOS
                </Badge>
              </div>

              <div className="text-xs text-slate-600 space-y-1">
                <div>Incident ID: <strong className="text-slate-800">{activeSOS.id}</strong></div>
                {coords && (
                  <div>
                    GPS Coordinates: <strong className="text-slate-800">{coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}</strong> (±{Math.round(coords.acc)}m accuracy)
                  </div>
                )}
                <div>Notified Guardians: <strong className="text-slate-800">{activeSOS.emergency_contacts_count || 'All Family Responders'}</strong></div>
              </div>

              {coords && (
                <a
                  href={`https://www.google.com/maps?q=${coords.lat},${coords.lng}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-teal-700 hover:underline font-semibold pt-1"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  <span>Open Coordinates in Google Maps</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          )}

          {!isTriggered && (
            <div className="text-left space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 uppercase block">
                Optional Emergency Note
              </label>
              <input
                type="text"
                placeholder="e.g. Severe chest tightness, alone at home"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-rose-500"
              />
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default EmergencySOSPage;
