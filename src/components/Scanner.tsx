import { motion } from "motion/react";
import { Search, ShieldAlert, Cpu, Wifi } from "lucide-react";

interface ScannerProps {
  isScanning: boolean;
  onComplete: () => void;
}

export default function Scanner({ isScanning, onComplete }: ScannerProps) {
  return (
    <div className="relative w-64 h-64 mx-auto mb-8 flex items-center justify-center">
      {/* Outer Glow */}
      {isScanning && (
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-amber-500/30"
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}

      {/* Rotating Radar */}
      <div className="absolute inset-0 rounded-full border border-white/10 overflow-hidden bg-white/5">
        {/* Radar Line */}
        {isScanning && (
          <motion.div
            className="absolute top-1/2 left-1/2 w-[200%] h-[200%] origin-top-left -translate-x-[0%] -translate-y-[0%] bg-gradient-to-tr from-amber-500/20 via-transparent to-transparent"
            animate={{ rotate: 360 }}
            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
          />
        )}
        
        {/* Grid Lines */}
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute top-1/2 w-full h-[1px] bg-white" />
          <div className="absolute left-1/2 h-full w-[1px] bg-white" />
          <div className="absolute inset-0 border border-white rounded-full scale-50" />
          <div className="absolute inset-0 border border-white rounded-full scale-75" />
        </div>
      </div>

      {/* Center Icon */}
      <div className="relative z-10 flex flex-col items-center">
        {isScanning ? (
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          >
            <Search className="w-12 h-12 text-amber-500" />
          </motion.div>
        ) : (
          <Wifi className="w-12 h-12 text-white/40" />
        )}
      </div>

      {isScanning && (
        <motion.div
          className="absolute -bottom-12 left-0 right-0 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <p className="font-mono text-[10px] text-amber-500/80 animate-pulse uppercase tracking-widest">
            Scanning signal spectrum...
          </p>
        </motion.div>
      )}
    </div>
  );
}
