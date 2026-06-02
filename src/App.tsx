import React, { useState, useEffect, useRef } from 'react';
import { Rocket, Flame, RotateCcw, Activity, Shield, Thermometer, Gauge } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type SimState = 'GROUND' | 'FLIGHT' | 'LANDED' | 'CRASHED';

const App: React.FC = () => {
  const [state, setState] = useState<SimState>('GROUND');
  const [altitude, setAltitude] = useState(0);
  const [velocity, setVelocity] = useState(0);
  const [fuel, setFuel] = useState(100);
  const [thrusting, setThrusting] = useState(false);
  const [maxAltitude, setMaxAltitude] = useState(0);
  const [weight, setWeight] = useState(10); // Default weight

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>();
  const physicsRef = useRef({
    alt: 0,
    vel: 0,
    fuel: 100,
    thrustForce: 3.5, // Base force
    gravity: 0.15,
  });

  const reset = () => {
    setState('GROUND');
    setAltitude(0);
    setVelocity(0);
    setFuel(100);
    setMaxAltitude(0);
    physicsRef.current = {
      alt: 0,
      vel: 0,
      fuel: 100,
      thrustForce: 3.5,
      gravity: 0.15,
    };
  };

  const updatePhysics = () => {
    if (state === 'FLIGHT') {
      const p = physicsRef.current;
      
      let acceleration = -p.gravity;
      
      if (thrusting && p.fuel > 0) {
        // a = F/m
        const thrustAcc = p.thrustForce / weight;
        acceleration += thrustAcc;
        p.fuel -= 0.1 * (p.thrustForce); // Fuel consumption linked to force
      }
      
      p.vel += acceleration;
      p.alt += p.vel;

      if (p.alt <= 0) {
        p.alt = 0;
        if (Math.abs(p.vel) > 2) {
          setState('CRASHED');
        } else {
          setState('LANDED');
        }
        p.vel = 0;
      }

      physicsRef.current = { ...p };
      setAltitude(p.alt);
      setVelocity(p.vel);
      setFuel(Math.max(0, p.fuel));
      if (p.alt > maxAltitude) setMaxAltitude(p.alt);
    }
  };

  const draw = (ctx: CanvasRenderingContext2D) => {
    const { width, height } = ctx.canvas;
    ctx.clearRect(0, 0, width, height);

    // Stars
    ctx.fillStyle = 'white';
    for (let i = 0; i < 50; i++) {
      const x = (Math.sin(i * 123.45) * 0.5 + 0.5) * width;
      const y = ((Math.cos(i * 678.9) * 0.5 + 0.5) * height + altitude * 0.5) % height;
      ctx.beginPath();
      ctx.arc(x, y, 1, 0, Math.PI * 2);
      ctx.fill();
    }

    // Ground
    const groundY = height - 50 + altitude;
    if (groundY < height + 100) {
      ctx.fillStyle = '#1a202c';
      ctx.fillRect(0, groundY, width, height - groundY);
      ctx.strokeStyle = '#2d3748';
      ctx.beginPath();
      ctx.moveTo(0, groundY);
      ctx.lineTo(width, groundY);
      ctx.stroke();
    }

    // Rocket
    const rx = width / 2;
    const ry = height - 100;

    if (state !== 'CRASHED') {
      // Body
      ctx.fillStyle = '#edf2f7';
      ctx.beginPath();
      ctx.moveTo(rx, ry - 40);
      ctx.lineTo(rx - 15, ry);
      ctx.lineTo(rx + 15, ry);
      ctx.fill();
      ctx.fillRect(rx - 15, ry, 30, 40);

      // Fins
      ctx.fillStyle = '#e53e3e';
      ctx.beginPath();
      ctx.moveTo(rx - 15, ry + 20);
      ctx.lineTo(rx - 30, ry + 40);
      ctx.lineTo(rx - 15, ry + 40);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(rx + 15, ry + 20);
      ctx.lineTo(rx + 30, ry + 40);
      ctx.lineTo(rx + 15, ry + 40);
      ctx.fill();

      // Window
      ctx.fillStyle = '#3182ce';
      ctx.beginPath();
      ctx.arc(rx, ry + 10, 5, 0, Math.PI * 2);
      ctx.fill();

      // Thrust fire
      if (thrusting && fuel > 0 && (state === 'FLIGHT' || state === 'GROUND')) {
        ctx.fillStyle = '#f6e05e';
        ctx.beginPath();
        ctx.moveTo(rx - 10, ry + 40);
        ctx.lineTo(rx, ry + 40 + Math.random() * 30 + 20);
        ctx.lineTo(rx + 10, ry + 40);
        ctx.fill();
        ctx.fillStyle = '#ed8936';
        ctx.beginPath();
        ctx.moveTo(rx - 5, ry + 40);
        ctx.lineTo(rx, ry + 40 + Math.random() * 20 + 10);
        ctx.lineTo(rx + 5, ry + 40);
        ctx.fill();
      }
    } else {
      // Crash particles
      ctx.fillStyle = '#e53e3e';
      for (let i = 0; i < 10; i++) {
        const ox = (Math.random() - 0.5) * 50;
        const oy = (Math.random() - 0.5) * 50;
        ctx.fillRect(rx + ox, ry + oy, 5, 5);
      }
    }
  };

  const animate = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        updatePhysics();
        draw(ctx);
      }
    }
    requestRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setThrusting(true);
        if (state === 'GROUND') setState('FLIGHT');
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') setThrusting(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    requestRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [state, thrusting, altitude, fuel]);

  return (
    <div className="flex-1 flex flex-col relative bg-[#0b0e14] text-slate-200 font-mono">
      {/* HUD Header */}
      <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-start pointer-events-none z-10">
        <div className="space-y-4">
          <div className="flex items-center space-x-3 bg-black/40 backdrop-blur-md p-3 rounded-lg border border-slate-700/50">
            <Activity className="text-blue-400 w-5 h-5" />
            <div>
              <p className="text-[10px] uppercase tracking-widest text-slate-500">Altitude</p>
              <p className="text-xl font-bold">{altitude.toFixed(1)}m</p>
            </div>
          </div>
          <div className="flex items-center space-x-3 bg-black/40 backdrop-blur-md p-3 rounded-lg border border-slate-700/50">
            <Gauge className="text-emerald-400 w-5 h-5" />
            <div>
              <p className="text-[10px] uppercase tracking-widest text-slate-500">Velocity</p>
              <p className="text-xl font-bold">{velocity.toFixed(2)}m/s</p>
            </div>
          </div>
        </div>

        <div className="text-center">
          <h1 className="text-2xl font-black tracking-tighter text-white flex items-center justify-center space-x-2">
            <Rocket className="text-blue-500" />
            <span>STELLAR-1 SIM</span>
          </h1>
          <div className="mt-2 px-3 py-1 bg-blue-500/10 border border-blue-500/30 rounded-full">
            <p className="text-[10px] text-blue-400 font-bold uppercase tracking-[0.2em]">{state}</p>
          </div>
        </div>

        <div className="space-y-4 pointer-events-auto">
          <div className="flex items-center space-x-3 bg-black/40 backdrop-blur-md p-3 rounded-lg border border-slate-700/50">
            <Thermometer className="text-orange-400 w-5 h-5" />
            <div className="w-32">
              <p className="text-[10px] uppercase tracking-widest text-slate-500">Fuel Reserves</p>
              <div className="h-2 bg-slate-800 rounded-full mt-1 overflow-hidden">
                <motion.div 
                  className="h-full bg-orange-500"
                  animate={{ width: `${fuel}%` }}
                />
              </div>
            </div>
          </div>
          
          <div className="bg-black/40 backdrop-blur-md p-3 rounded-lg border border-slate-700/50">
             <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-2">Rocket Mass (Weight)</p>
             <input 
               type="range" 
               min="5" 
               max="50" 
               step="1" 
               value={weight} 
               onChange={(e) => setWeight(Number(e.target.value))}
               disabled={state !== 'GROUND'}
               className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
             />
             <div className="flex justify-between mt-1">
               <span className="text-[10px] text-slate-500">{weight} kg</span>
               {state !== 'GROUND' && <span className="text-[10px] text-orange-400">LOCKED</span>}
             </div>
          </div>

          <div className="flex items-center space-x-3 bg-black/40 backdrop-blur-md p-3 rounded-lg border border-slate-700/50">
            <Shield className="text-purple-400 w-5 h-5" />
            <div>
              <p className="text-[10px] uppercase tracking-widest text-slate-500">Max Alt</p>
              <p className="text-xl font-bold">{maxAltitude.toFixed(1)}m</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Simulation Area */}
      <canvas 
        ref={canvasRef} 
        width={window.innerWidth} 
        height={window.innerHeight}
        className="flex-1 cursor-crosshair"
      />

      {/* Controls Footer */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center space-y-6 z-20">
        <AnimatePresence>
          {(state === 'LANDED' || state === 'CRASHED') && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="bg-black/80 backdrop-blur-xl p-8 rounded-2xl border border-slate-700 text-center shadow-2xl"
            >
              <h2 className={`text-4xl font-black mb-2 ${state === 'CRASHED' ? 'text-red-500' : 'text-emerald-500'}`}>
                {state === 'CRASHED' ? 'MISSION FAILURE' : 'MISSION SUCCESS'}
              </h2>
              <p className="text-slate-400 mb-6">
                {state === 'CRASHED' 
                  ? 'The craft was destroyed on impact. Velocity was too high.' 
                  : 'Perfect landing! The crew is safe and the data is secured.'}
              </p>
              <button 
                onClick={reset}
                className="flex items-center space-x-2 bg-white text-black px-6 py-3 rounded-xl font-bold hover:bg-slate-200 transition-colors"
              >
                <RotateCcw size={20} />
                <span>REINITIALIZE</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {state === 'GROUND' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center space-y-4"
          >
            <div className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg backdrop-blur-sm">
              <p className="text-xs text-slate-400">HOLD <span className="text-white font-bold">[SPACE]</span> TO IGNITE ENGINES</p>
            </div>
          </motion.div>
        )}

        {state === 'FLIGHT' && (
          <div className="flex space-x-4">
             <button 
                onMouseDown={() => setThrusting(true)}
                onMouseUp={() => setThrusting(false)}
                className={`w-20 h-20 rounded-full flex items-center justify-center transition-all ${thrusting ? 'bg-orange-500 scale-95 shadow-[0_0_50px_rgba(249,115,22,0.5)]' : 'bg-slate-800 hover:bg-slate-700'}`}
              >
                <Flame className={thrusting ? 'text-white' : 'text-slate-400'} size={32} />
              </button>
          </div>
        )}
      </div>

      {/* Decorative Overlays */}
      <div className="absolute inset-0 pointer-events-none border-[20px] border-black/20" />
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.4)_100%)]" />
      <div className="absolute top-1/2 left-10 h-32 w-[1px] bg-slate-800" />
      <div className="absolute top-1/2 right-10 h-32 w-[1px] bg-slate-800" />
    </div>
  );
};

export default App;
