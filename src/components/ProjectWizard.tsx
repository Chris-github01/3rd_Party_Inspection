import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { WizardStep1 } from './wizard/WizardStep1';
import { WizardStep2 } from './wizard/WizardStep2';
import { WizardStep3 } from './wizard/WizardStep3';
import { WizardStep4 } from './wizard/WizardStep4';
import { WizardStep5 } from './wizard/WizardStep5';
import { WizardStep6 } from './wizard/WizardStep6';
import { WizardStep7 } from './wizard/WizardStep7';

export interface WizardData {
  projectName: string;
  package: string;
  siteType: string;
  projectImagePath?: string;
  clientId: string;
  clientName: string;
  setupMode: 'template' | 'duplicate' | 'hybrid';
  templateId: string;
  templateName: string;
  sourceProjectId: string;
  sourceProjectName: string;
  clonedElements: string[];
  drawingMode: 'with_drawings' | 'without_drawings';
  country: string;
  addressLine: string;
  suburb: string;
  city: string;
  postcode: string;
  latitude: number | null;
  longitude: number | null;
  what3words: string;
}

interface ProjectWizardProps {
  onClose: () => void;
}

const STORAGE_KEY = 'project_wizard_draft';

export function ProjectWizard({ onClose }: ProjectWizardProps) {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [wizardData, setWizardData] = useState<WizardData>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return getDefaultData();
      }
    }
    return getDefaultData();
  });

  function getDefaultData(): WizardData {
    return {
      projectName: '',
      package: '',
      siteType: 'Single Site',
      clientId: '',
      clientName: '',
      setupMode: 'template',
      templateId: '',
      templateName: '',
      sourceProjectId: '',
      sourceProjectName: '',
      clonedElements: [],
      drawingMode: 'with_drawings',
      country: 'New Zealand',
      addressLine: '',
      suburb: '',
      city: '',
      postcode: '',
      latitude: null,
      longitude: null,
      what3words: '',
    };
  }

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(wizardData));
  }, [wizardData]);

  const updateData = (updates: Partial<WizardData>) => {
    setWizardData((prev) => ({ ...prev, ...updates }));
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return wizardData.projectName.trim() !== '';
      case 2:
        return wizardData.clientId !== '';
      case 3:
        if (wizardData.setupMode === 'template') {
          return wizardData.templateId !== '';
        }
        if (wizardData.setupMode === 'duplicate') {
          return wizardData.sourceProjectId !== '' && wizardData.clonedElements.length > 0;
        }
        if (wizardData.setupMode === 'hybrid') {
          return wizardData.templateId !== '' && wizardData.sourceProjectId !== '';
        }
        return false;
      case 4:
        return wizardData.drawingMode !== '';
      case 5:
        return wizardData.addressLine !== '' && wizardData.city !== '';
      case 6:
        return wizardData.latitude !== null && wizardData.longitude !== null;
      case 7:
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (canProceed() && currentStep < 7) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleClose = () => {
    if (confirm('Exit wizard? Your progress will be saved as a draft.')) {
      onClose();
    }
  };

  const handleComplete = () => {
    localStorage.removeItem(STORAGE_KEY);
    onClose();
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <WizardStep1 data={wizardData} updateData={updateData} />;
      case 2:
        return <WizardStep2 data={wizardData} updateData={updateData} />;
      case 3:
        return <WizardStep3 data={wizardData} updateData={updateData} />;
      case 4:
        return <WizardStep4 data={wizardData} updateData={updateData} />;
      case 5:
        return <WizardStep5 data={wizardData} updateData={updateData} />;
      case 6:
        return <WizardStep6 data={wizardData} updateData={updateData} />;
      case 7:
        return <WizardStep7 data={wizardData} onComplete={handleComplete} />;
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900 bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full my-8 flex flex-col max-h-[calc(100vh-4rem)]">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              New Single Site Project
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              Step {currentStep} of 7
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="px-6 py-2 border-b border-slate-200">
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5, 6, 7].map((step) => (
              <div
                key={step}
                className={`flex-1 h-2 rounded-full ${
                  step < currentStep
                    ? 'bg-green-500'
                    : step === currentStep
                    ? 'bg-primary-600'
                    : 'bg-slate-200'
                }`}
              />
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          {renderStep()}
        </div>

        <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between">
          <button
            onClick={handleBack}
            disabled={currentStep === 1}
            className="flex items-center gap-2 px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-5 h-5" />
            Back
          </button>

          {currentStep < 7 ? (
            <button
              onClick={handleNext}
              disabled={!canProceed()}
              className="flex items-center gap-2 px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
              <ChevronRight className="w-5 h-5" />
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
