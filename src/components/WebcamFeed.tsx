import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, CameraOff } from "lucide-react";

interface WebcamFeedProps {
  fallbackImage?: string;
  className?: string;
  animate?: any;
  transition?: any;
  selectedDeviceId?: string;
  onDevicesFound?: (devices: { id: string; label: string }[]) => void;
  circular?: boolean;
}

export const WebcamFeed: React.FC<WebcamFeedProps> = ({
  fallbackImage = "/images/contestant1.png",
  className = "w-[400px] h-[300px] object-cover rounded-xl shadow-2xl border-4 border-blue-600/50",
  animate,
  transition,
  selectedDeviceId,
  onDevicesFound,
  circular = false,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let activeStream: MediaStream | null = null;

    async function initCamera() {
      setIsLoading(true);
      setHasError(false);
      
      // Stop existing tracks first
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }

      try {
        const constraints: MediaStreamConstraints = {
          video: selectedDeviceId
            ? { deviceId: { exact: selectedDeviceId }, width: { ideal: 640 }, height: { ideal: 480 } }
            : { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false,
        };
        
        const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
        activeStream = mediaStream;
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }

        // After permission is granted, list all available video devices
        navigator.mediaDevices.enumerateDevices().then((devices) => {
          const videoDevices = devices
            .filter((d) => d.kind === "videoinput")
            .map((d) => ({
              id: d.deviceId,
              label: d.label || `Camera (${d.deviceId.slice(0, 5)})`,
            }));
          if (onDevicesFound) {
            onDevicesFound(videoDevices);
          }
        }).catch((err) => {
          console.warn("Could not enumerate devices:", err);
        });

      } catch (err) {
        console.warn("Webcam access failed or denied:", err);
        // If exact deviceId failed, try default user camera
        if (selectedDeviceId) {
          try {
            console.log("Retrying with default user camera...");
            const defaultStream = await navigator.mediaDevices.getUserMedia({
              video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
              audio: false,
            });
            activeStream = defaultStream;
            setStream(defaultStream);
            if (videoRef.current) {
              videoRef.current.srcObject = defaultStream;
            }
          } catch (retryErr) {
            setHasError(true);
          }
        } else {
          setHasError(true);
        }
      } finally {
        setIsLoading(false);
      }
    }

    initCamera();

    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach((track) => {
          track.stop();
        });
      }
    };
  }, [selectedDeviceId]);

  // Update video ref srcObject when stream becomes available (safeguard)
  useEffect(() => {
    if (stream && videoRef.current && !videoRef.current.srcObject) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const sizeClasses = circular ? "w-[280px] h-[280px] rounded-full" : "w-[400px] h-[300px] rounded-xl";

  if (hasError) {
    // Graceful fallback to static image
    return (
      <div className="relative">
        <motion.img
          src={`${import.meta.env.BASE_URL}images/contestant1.png`}
          alt="Contestant Fallback"
          className={`${sizeClasses} object-cover shadow-2xl border-4 border-[#fca311]`}
          animate={animate}
          transition={transition}
        />
        {!circular && (
          <div className="absolute bottom-3 right-3 bg-black/70 px-3 py-1 rounded-full text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1 border border-white/10">
            <CameraOff size={10} className="text-red-500" />
            Camera Offline
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`relative flex items-center justify-center overflow-hidden ${circular ? 'rounded-full' : 'rounded-xl'}`}>
      {isLoading ? (
        <div className={`bg-slate-900 flex flex-col items-center justify-center gap-3 ${sizeClasses} border-4 border-[#fca311]/50`}>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400" />
          {!circular && (
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest animate-pulse">
              Iniciando Cámara...
            </span>
          )}
        </div>
      ) : (
        <motion.div 
          className={`relative overflow-hidden group border-4 border-[#fca311]/80 shadow-[0_0_25px_rgba(252,163,17,0.3)] bg-black ${sizeClasses}`}
          animate={animate}
          transition={transition}
        >
          {/* Live indicator tag */}
          {!circular && (
            <div className="absolute top-4 left-4 z-10 bg-red-600/90 text-white text-[10px] font-black px-2.5 py-1 rounded-md uppercase tracking-[0.2em] flex items-center gap-1.5 shadow-lg border border-red-500/20">
              <span className="h-2 w-2 rounded-full bg-white animate-ping" />
              <span className="h-1.5 w-1.5 rounded-full bg-white absolute top-[8px] left-[14px]" />
              LIVE FEED
            </div>
          )}

          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`${sizeClasses} object-cover scale-x-[-1]`} // Mirrored video for more natural player feel
          />

          {!circular && (
            <div className="absolute bottom-3 right-3 bg-black/70 px-3 py-1 rounded-full text-[10px] font-black text-emerald-400 uppercase tracking-widest flex items-center gap-1 border border-white/10">
              <Camera size={10} />
              Player Cam
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
};

export default WebcamFeed;
