import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { WizardStep0 } from './wizard/WizardStep0';
import { WizardStep1 } from './wizard/WizardStep1';
import { WizardStep2 } from './wizard/WizardStep2';
import { WizardStep3 } from './wizard/WizardStep3';
import { WizardStep4 } from './wizard/WizardStep4';
import { WizardStep5 } from './wizard/WizardStep5';
import { WizardStep6 } from './wizard/WizardStep6';

export interface WizardData {
  // Step 0: Organization Selection (NEW - MANDATORY FIRST STEP)
  organizationId: string;
  organizationName: string;
  organizationLogoUrl: string | null;

  // Step 1: Project Details
  projectName: string;
  package: string;
  siteType: string;
  projectImagePath?: string;

  // Step 2: Client Selection
  clientId: string;
  clientName: string;

  // Step 3: Template Setup
  setupMode: 'template' | 'duplicate' | 'hybrid';
  templateId: string;
  templateName: string;
  sourceProjectId: string;
  sourceProjectName: string;
  clonedElements: string[];
  drawingMode: 'with_drawings' | 'without_drawings';

  // Step 4: Location & Address
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
  const [currentStep, setCurrentStep] = useState(0);
  const [wizardData, setWizardData] = useState<WizardData>(() => {
    // Use sessionStorage instead of localStorage for security
    // Data is cleared when browser tab closes
    const saved = sessionStorage.getItem(STORAGE_KEY);
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
      // Step 0: Organization
      organizationId: '',
      organizationName: '',
      organizationLogoUrl: null,

      // Step 1: Project Details
      projectName: '',
      package: '',
      siteType: 'Single Site',
      projectImagePath: undefined,

      // Step 2: Client
      clientId: '',
      clientName: '',

      // Step 3: Template Setup
      setupMode: 'template',
      templateId: '',
      templateName: '',
      sourceProjectId: '',
      sourceProjectName: '',
      clonedElements: [],
      drawingMode: 'with_drawings',

      // Step 4: Location
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
    // Use sessionStorage for temporary data storage
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(wizardData));
  }, [wizardData]);

  const updateData = (updates: Partial<WizardData>) => {
    setWizardData((prev) => ({ ...prev, ...updates }));
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0:
        return wizardData.organizationId !== '';
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
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (canProceed() && currentStep < 6) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleClose = () => {
    if (confirm('Exit wizard? Your progress will be saved as a draft.')) {
      onClose();
    }
  };

  const handleComplete = () => {
    sessionStorage.removeItem(STORAGE_KEY);
    onClose();
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return <WizardStep0 data={wizardData} updateData={updateData} />;
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
        return <WizardStep6 data={wizardData} onComplete={handleComplete} />;
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900 bg-opacity-75 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-slate-900 rounded-xl shadow-2xl max-w-4xl w-full my-8 flex flex-col max-h-[calc(100vh-4rem)] border border-slate-700">
        <div className="px-6 py-4 border-b border-slate-700 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">
              New Single Site Project
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Step {currentStep + 1} of 7
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="px-6 py-2 border-b border-slate-700">
          <div className="flex items-center gap-2">
            {[0, 1, 2, 3, 4, 5, 6].map((step) => (
              <div
                key={step}
                className={`flex-1 h-2 rounded-full transition-colors ${
                  step < currentStep
                    ? 'bg-green-500'
                    : step === currentStep
                    ? 'bg-primary-600'
                    : 'bg-slate-700'
                }`}
              />
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6 bg-slate-900">
          {renderStep()}
        </div>

        <div className="px-6 py-4 border-t border-slate-700 flex items-center justify-between bg-slate-900">
          <button
            onClick={handleBack}
            disabled={currentStep === 0}
            className="flex items-center gap-2 px-4 py-2 text-slate-300 hover:bg-slate-800 hover:text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
            Back
          </button>

          {currentStep < 6 ? (
            <button
              onClick={handleNext}
              disabled={!canProceed()}
              className="flex items-center gap-2 px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold"
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
