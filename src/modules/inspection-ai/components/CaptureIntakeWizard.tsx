import { useState } from 'react';
import {
  Camera,
  Upload,
  ChevronRight,
  ChevronLeft,
  CheckCircle,
  Flame,
  Building2,
  Shield,
  Wind,
  HelpCircle,
  Zap,
  Layers,
  Sun,
  Home,
  AlertTriangle,
} from 'lucide-react';
import type {
  SystemType,
  ElementType,
  Environment,
  ObservedConcern,
  CaptureIntakeContext,
} from '../types';

const SYSTEM_OPTIONS: { value: SystemType; icon: React.ReactNode; desc: string }[] = [
  { value: 'Intumescent',       icon: <Flame className="w-5 h-5" />,     desc: 'Passive fire boards, spray, mastic' },
  { value: 'Cementitious',      icon: <Building2 className="w-5 h-5" />, desc: 'Spray-applied cement-based system' },
  { value: 'Protective Coating',icon: <Shield className="w-5 h-5" />,    desc: 'Epoxy, zinc, anti-corrosion' },
  { value: 'Firestopping',      icon: <Wind className="w-5 h-5" />,      desc: 'Penetrations, joints, seals' },
];

const ELEMENT_OPTIONS: { value: ElementType; label: string }[] = [
  { value: 'Beam',        label: 'Beam' },
  { value: 'Column',      label: 'Column' },
  { value: 'Slab',        label: 'Slab' },
  { value: 'Penetration', label: 'Penetration' },
  { value: 'Other',       label: 'Other' },
];

const ENVIRONMENT_OPTIONS: { value: Environment; icon: React.ReactNode; label: string }[] = [
  { value: 'Internal',       icon: <Home className="w-4 h-4" />,  label: 'Internal' },
  { value: 'External',       icon: <Sun className="w-4 h-4" />,   label: 'External' },
  { value: 'Exposed / Harsh',icon: <Zap className="w-4 h-4" />,  label: 'Exposed / Harsh' },
];

const CONCERN_OPTIONS: { value: ObservedConcern; colour: string; dot: string }[] = [
  { value: 'Cracking',            colour: 'border-amber-300 bg-amber-50 text-amber-800',   dot: 'bg-amber-400' },
  { value: 'Rust / Corrosion',    colour: 'border-red-300 bg-red-50 text-red-800',         dot: 'bg-red-500' },
  { value: 'Damage',              colour: 'border-orange-300 bg-orange-50 text-orange-800',dot: 'bg-orange-400' },
  { value: 'Missing Material',    colour: 'border-red-400 bg-red-50 text-red-900',         dot: 'bg-red-600' },
  { value: 'Blistering / Bubbling',colour:'border-blue-300 bg-blue-50 text-blue-800',      dot: 'bg-blue-400' },
  { value: 'Delamination',        colour: 'border-slate-300 bg-slate-50 text-slate-800',   dot: 'bg-slate-500' },
  { value: 'Unsure',              colour: 'border-slate-200 bg-white text-slate-600',      dot: 'bg-slate-300' },
];

interface Props {
  initialContext?: Partial<CaptureIntakeContext>;
  onCaptureCamera: (ctx: CaptureIntakeContext) => void;
  onCaptureUpload: (ctx: CaptureIntakeContext) => void;
  onCancel: () => void;
}

export function CaptureIntakeWizard({ initialContext, onCaptureCamera, onCaptureUpload, onCancel }: Props) {
  const [step, setStep] = useState(0);
  const [systemType, setSystemType] = useState<SystemType>(initialContext?.systemType ?? 'Intumescent');
  const [element, setElement] = useState<ElementType>(initialContext?.element ?? 'Beam');
  const [environment, setEnvironment] = useState<Environment>(initialContext?.environment ?? 'Internal');
  const [observedConcern, setObservedConcern] = useState<ObservedConcern>(initialContext?.observedConcern ?? 'Unsure');
  const [isNewInstall, setIsNewInstall] = useState<boolean>(initialContext?.isNewInstall ?? false);

  const context: CaptureIntakeContext = { systemType, element, environment, observedConcern, isNewInstall };

  const steps = ['System', 'Element', 'Concern', 'Capture'];
  const totalSteps = steps.length;

  const canAdvance = step < totalSteps - 1;

  const StepDots = () => (
    <div className="flex items-center gap-1.5 justify-center mb-6">
      {steps.map((_, i) => (
        <div
          key={i}
          className={`h-1.5 rounded-full transition-all ${
            i === step ? 'w-6 bg-slate-900' : i < step ? 'w-1.5 bg-slate-400' : 'w-1.5 bg-slate-200'
          }`}
        />
      ))}
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-slate-100 flex-shrink-0">
        <button
          onClick={step === 0 ? onCancel : () => setStep(s => s - 1)}
          className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors"
        >
          {step === 0 ? (
            <span className="text-slate-400 text-lg leading-none">×</span>
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </button>
        <div className="text-center">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
            {steps[step]}
          </p>
          <p className="text-[10px] text-slate-300 mt-0.5">{step + 1} of {totalSteps}</p>
        </div>
        <div className="w-8" />
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5">
        <StepDots />

        {step === 0 && (
          <div className="space-y-3">
            <div className="mb-5">
              <h2 className="text-xl font-bold text-slate-900 leading-tight">What system are you inspecting?</h2>
              <p className="text-sm text-slate-400 mt-1">Select the applied system type</p>
            </div>
            {SYSTEM_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => { setSystemType(opt.value); setStep(1); }}
                className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left active:scale-98 ${
                  systemType === opt.value
                    ? 'border-slate-900 bg-slate-50'
                    : 'border-slate-200 bg-white hover:border-slate-400'
                }`}
              >
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  systemType === opt.value ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500'
                }`}>
                  {opt.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-900 text-sm">{opt.value}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{opt.desc}</p>
                </div>
                {systemType === opt.value && (
                  <CheckCircle className="w-5 h-5 text-slate-900 flex-shrink-0" />
                )}
              </button>
            ))}
          </div>
        )}

        {step === 1 && (
          <div className="space-y-3">
            <div className="mb-5">
              <h2 className="text-xl font-bold text-slate-900 leading-tight">What element type?</h2>
              <p className="text-sm text-slate-400 mt-1">Select the structural element being inspected</p>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {ELEMENT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => { setElement(opt.value); }}
                  className={`py-4 px-3 rounded-2xl border-2 font-bold text-sm transition-all active:scale-95 ${
                    element === opt.value
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <div className="pt-3">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Environment</p>
              <div className="grid grid-cols-3 gap-2">
                {ENVIRONMENT_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setEnvironment(opt.value)}
                    className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 text-xs font-semibold transition-all ${
                      environment === opt.value
                        ? 'border-slate-900 bg-slate-900 text-white'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-400'
                    }`}
                  >
                    {opt.icon}
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Installation status</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: true, label: 'New Install' },
                  { value: false, label: 'Existing / Aged' },
                ].map((opt) => (
                  <button
                    key={String(opt.value)}
                    onClick={() => setIsNewInstall(opt.value)}
                    className={`py-3 rounded-xl border-2 text-xs font-bold transition-all ${
                      isNewInstall === opt.value
                        ? 'border-slate-900 bg-slate-900 text-white'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-400'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-2.5">
            <div className="mb-5">
              <h2 className="text-xl font-bold text-slate-900 leading-tight">What concern do you see?</h2>
              <p className="text-sm text-slate-400 mt-1">Select what you can observe — helps the AI reason correctly</p>
            </div>
            {CONCERN_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => { setObservedConcern(opt.value); setStep(3); }}
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl border-2 transition-all text-left active:scale-98 ${
                  observedConcern === opt.value
                    ? `${opt.colour} border-opacity-100`
                    : `${opt.colour} border-opacity-60 opacity-80 hover:opacity-100`
                }`}
              >
                <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${opt.dot}`} />
                <span className="font-semibold text-sm">{opt.value}</span>
                {observedConcern === opt.value && (
                  <CheckCircle className="w-4 h-4 ml-auto flex-shrink-0" />
                )}
              </button>
            ))}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3">
            <div className="mb-5">
              <h2 className="text-xl font-bold text-slate-900 leading-tight">Ready to capture</h2>
              <p className="text-sm text-slate-400 mt-1">Senior Inspector AI will analyse your photo with full context</p>
            </div>

            <div className="bg-slate-50 rounded-2xl p-4 space-y-2.5 mb-4">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Context Summary</p>
              <SummaryRow icon={<Layers className="w-3.5 h-3.5" />} label="System" value={systemType} />
              <SummaryRow icon={<Building2 className="w-3.5 h-3.5" />} label="Element" value={element} />
              <SummaryRow icon={environment === 'Internal' ? <Home className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />} label="Environment" value={environment} />
              <SummaryRow icon={<AlertTriangle className="w-3.5 h-3.5" />} label="Concern" value={observedConcern} />
              <SummaryRow icon={<CheckCircle className="w-3.5 h-3.5" />} label="Install" value={isNewInstall ? 'New installation' : 'Existing / aged'} />
            </div>

            <button
              onClick={() => onCaptureCamera(context)}
              className="w-full flex items-center gap-4 bg-slate-900 text-white py-4 px-5 rounded-2xl font-semibold text-sm hover:bg-slate-800 transition-colors active:scale-95"
            >
              <div className="w-10 h-10 bg-white/15 rounded-xl flex items-center justify-center flex-shrink-0">
                <Camera className="w-5 h-5" />
              </div>
              <div className="text-left">
                <p className="font-bold text-sm">Take Photo</p>
                <p className="text-xs text-white/60">Camera · AI analysis starts immediately</p>
              </div>
              <ChevronRight className="w-4 h-4 ml-auto text-white/50 flex-shrink-0" />
            </button>

            <button
              onClick={() => onCaptureUpload(context)}
              className="w-full flex items-center gap-4 border-2 border-slate-200 bg-white text-slate-700 py-4 px-5 rounded-2xl font-semibold text-sm hover:border-slate-400 transition-colors active:scale-95"
            >
              <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Upload className="w-5 h-5 text-slate-500" />
              </div>
              <div className="text-left">
                <p className="font-bold text-sm">Upload Image</p>
                <p className="text-xs text-slate-400">Select from gallery</p>
              </div>
              <ChevronRight className="w-4 h-4 ml-auto text-slate-300 flex-shrink-0" />
            </button>

            <button
              onClick={() => onCaptureUpload({ ...context })}
              className="w-full text-center text-slate-400 text-sm py-3 hover:text-slate-600 transition-colors"
            >
              <HelpCircle className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" />
              Skip AI — classify manually
            </button>
          </div>
        )}
      </div>

      {canAdvance && step < 3 && (
        <div className="px-5 pb-safe flex-shrink-0 border-t border-slate-100"
          style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}
        >
          <button
            onClick={() => setStep(s => s + 1)}
            className="w-full flex items-center justify-center gap-2 mt-4 bg-slate-900 text-white py-3.5 rounded-2xl font-bold text-sm hover:bg-slate-800 transition-colors active:scale-95"
          >
            Continue
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}

function SummaryRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="text-slate-400 flex-shrink-0">{icon}</span>
      <span className="text-xs text-slate-500 w-20 flex-shrink-0">{label}</span>
      <span className="text-xs font-semibold text-slate-800 truncate">{value}</span>
    </div>
  );
}
