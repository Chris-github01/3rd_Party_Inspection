import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useOutletContext } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { ZoomIn, ZoomOut, Maximize, MapPin, X } from 'lucide-react';
import { SteelMemberSelect } from '../../components/SteelMemberSelect';
import { normalizeFRRValue } from '../../lib/frrUtils';

interface Drawing {
  id: string;
  preview_image_path: string;
  page_number: number;
  level_id: string;
  levels?: {
    name: string;
    block_id: string;
    blocks?: {
      name: string;
    };
  };
}

interface Pin {
  id: string;
  x: number;
  y: number;
  label: string;
  member_name: string;
  status: string;
  package_id: string;
  inspection_packages?: {
    name: string;
    frr_minutes: number;
    required_thickness_value: number;
    required_thickness_unit: string;
  };
}

interface InspectionPackage {
  id: string;
  name: string;
  frr_minutes: number;
  required_thickness_value: number;
  required_thickness_unit: string;
}

export function DrawingsView() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { setCurrentLevel } = useOutletContext<any>();

  const [drawings, setDrawings] = useState<Drawing[]>([]);
  const [selectedDrawing, setSelectedDrawing] = useState<Drawing | null>(null);
  const [pins, setPins] = useState<Pin[]>([]);
  const [packages, setPackages] = useState<InspectionPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [dropMode, setDropMode] = useState(false);
  const [showPinSetup, setShowPinSetup] = useState(false);
  const [newPinPos, setNewPinPos] = useState<{ x: number; y: number } | null>(null);

  const [pinForm, setPinForm] = useState({
    member_name: '',
    steel_member_id: '',
    package_id: '',
    label: '',
  });

  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadDrawings();
    loadPackages();
  }, [projectId]);

  useEffect(() => {
    if (selectedDrawing) {
      loadPins(selectedDrawing.id);
      if (selectedDrawing.levels) {
        const levelName = selectedDrawing.levels.blocks
          ? `${selectedDrawing.levels.blocks.name} - ${selectedDrawing.levels.name}`
          : selectedDrawing.levels.name;
        setCurrentLevel(levelName);
      }
    }
  }, [selectedDrawing]);

  const loadDrawings = async () => {
    if (!projectId) return;

    const { data, error } = await supabase
      .from('drawings')
      .select('*, levels(name, block_id, blocks(name))')
      .eq('levels.block_id', (await supabase.from('blocks').select('id').eq('project_id', projectId)).data?.[0]?.id || '')
      .order('page_number');

    if (error) {
      console.error('Error loading drawings:', error);
      return;
    }

    setDrawings(data || []);
    if (data && data.length > 0) {
      setSelectedDrawing(data[0]);
    }
    setLoading(false);
  };

  const loadPackages = async () => {
    if (!projectId) return;

    const { data, error } = await supabase
      .from('inspection_packages')
      .select('*')
      .eq('project_id', projectId)
      .order('is_default', { ascending: false });

    if (error) {
      console.error('Error loading packages:', error);
      return;
    }

    setPackages(data || []);
    if (data && data.length > 0) {
      const defaultPkg = data.find((p) => p.is_default) || data[0];
      setPinForm({ ...pinForm, package_id: defaultPkg.id });
    }
  };

  const loadPins = async (drawingId: string) => {
    const { data, error } = await supabase
      .from('drawing_pins')
      .select('*, inspection_packages(name, frr_minutes, required_thickness_value, required_thickness_unit)')
      .eq('drawing_id', drawingId);

    if (error) {
      console.error('Error loading pins:', error);
      return;
    }

    setPins(data || []);
  };

  const handleImageClick = (e: React.MouseEvent<HTMLImageElement>) => {
    if (!dropMode || !imageRef.current) return;

    const rect = imageRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    setNewPinPos({ x, y });
    setShowPinSetup(true);
  };

  const handleCreatePin = async () => {
    if (!selectedDrawing || !newPinPos || !projectId || !pinForm.package_id) return;

    const { data: blockData } = await supabase
      .from('blocks')
      .select('id')
      .eq('project_id', projectId)
      .maybeSingle();

    const { error } = await supabase.from('drawing_pins').insert({
      drawing_id: selectedDrawing.id,
      project_id: projectId,
      block_id: blockData?.id,
      level_id: selectedDrawing.level_id,
      x: newPinPos.x,
      y: newPinPos.y,
      steel_member_id: pinForm.steel_member_id || null,
      member_name: pinForm.member_name,
      package_id: pinForm.package_id,
      label: pinForm.label || pinForm.member_name,
      pin_type: 'inspection',
      status: 'not_started',
    });

    if (error) {
      console.error('Error creating pin:', error);
      alert('Failed to create pin');
      return;
    }

    setShowPinSetup(false);
    setDropMode(false);
    setNewPinPos(null);
    setPinForm({
      member_name: '',
      steel_member_id: '',
      package_id: packages.find((p) => p.is_default)?.id || '',
      label: ''
    });
    loadPins(selectedDrawing.id);
  };

  const handleStartInspection = async () => {
    if (!selectedDrawing || !newPinPos || !projectId || !pinForm.package_id) return;

    const { data: blockData } = await supabase
      .from('blocks')
      .select('id')
      .eq('project_id', projectId)
      .maybeSingle();

    const { data: pinData, error: pinError } = await supabase
      .from('drawing_pins')
      .insert({
        drawing_id: selectedDrawing.id,
        project_id: projectId,
        block_id: blockData?.id,
        level_id: selectedDrawing.level_id,
        x: newPinPos.x,
        y: newPinPos.y,
        steel_member_id: pinForm.steel_member_id || null,
        member_name: pinForm.member_name,
        package_id: pinForm.package_id,
        label: pinForm.label || pinForm.member_name,
        pin_type: 'inspection',
        status: 'in_progress',
      })
      .select()
      .single();

    if (pinError || !pinData) {
      console.error('Error creating pin:', pinError);
      alert('Failed to create pin');
      return;
    }

    const { data: inspectionData, error: inspectionError } = await supabase
      .from('pin_inspections')
      .insert({
        pin_id: pinData.id,
        project_id: projectId,
        inspector_user_id: (await supabase.auth.getUser()).data.user?.id,
        inspection_status: 'Draft',
        steel_member_id: pinForm.steel_member_id || null,
        member_designation_snapshot: pinForm.member_name,
      })
      .select()
      .single();

    if (inspectionError || !inspectionData) {
      console.error('Error creating inspection:', inspectionError);
      alert('Failed to create inspection');
      return;
    }

    setShowPinSetup(false);
    setDropMode(false);
    navigate(`/projects/${projectId}/site/pins/${pinData.id}/inspect/${inspectionData.id}`);
  };

  const handlePinClick = (pin: Pin) => {
    navigate(`/projects/${projectId}/site/pins/${pin.id}`);
  };

  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.25, 3));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.25, 0.5));
  const handleResetZoom = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (dropMode) return;
    setIsPanning(true);
    setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning) return;
    setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const getPinColor = (status: string) => {
    switch (status) {
      case 'not_started':
        return 'bg-blue-500';
      case 'in_progress':
        return 'bg-yellow-500';
      case 'pass':
        return 'bg-green-500';
      case 'repair_required':
        return 'bg-red-500';
      default:
        return 'bg-slate-500';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (drawings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <MapPin className="w-16 h-16 text-slate-300 mb-4" />
        <h3 className="text-lg font-medium text-slate-900 mb-2">No drawings available</h3>
        <p className="text-slate-600">Upload drawings in the Site Manager to get started</p>
      </div>
    );
  }

  if (packages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <MapPin className="w-16 h-16 text-slate-300 mb-4" />
        <h3 className="text-lg font-medium text-slate-900 mb-2">No inspection packages</h3>
        <p className="text-slate-600 mb-4">Create an inspection package before dropping pins</p>
        <button
          onClick={() => navigate(`/projects/${projectId}/site/packages`)}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
        >
          Create Package
        </button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-slate-900">
      <div className="bg-slate-800 border-b border-slate-700 p-3 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <button
            onClick={handleZoomOut}
            className="p-2 bg-slate-700 hover:bg-slate-600 text-white rounded transition-colors"
            aria-label="Zoom out"
          >
            <ZoomOut className="w-5 h-5" />
          </button>
          <span className="text-white text-sm font-medium min-w-[60px] text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={handleZoomIn}
            className="p-2 bg-slate-700 hover:bg-slate-600 text-white rounded transition-colors"
            aria-label="Zoom in"
          >
            <ZoomIn className="w-5 h-5" />
          </button>
          <button
            onClick={handleResetZoom}
            className="p-2 bg-slate-700 hover:bg-slate-600 text-white rounded transition-colors"
            aria-label="Reset zoom"
          >
            <Maximize className="w-5 h-5" />
          </button>
        </div>

        <button
          onClick={() => setDropMode(!dropMode)}
          className={`flex items-center space-x-2 px-4 py-2 rounded transition-colors ${
            dropMode
              ? 'bg-blue-600 text-white'
              : 'bg-slate-700 hover:bg-slate-600 text-white'
          }`}
        >
          <MapPin className="w-5 h-5" />
          <span className="text-sm font-medium">{dropMode ? 'Pin Mode Active' : 'Drop Pin'}</span>
        </button>
      </div>

      <div
        ref={containerRef}
        className="flex-1 overflow-hidden relative bg-slate-900"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ cursor: dropMode ? 'crosshair' : isPanning ? 'grabbing' : 'grab' }}
      >
        {selectedDrawing?.preview_image_path && (
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: 'center',
              transition: isPanning ? 'none' : 'transform 0.2s',
            }}
          >
            <div className="relative">
              <img
                ref={imageRef}
                src={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/${selectedDrawing.preview_image_path}`}
                alt="Drawing"
                className="max-w-full max-h-full"
                onClick={handleImageClick}
                style={{ pointerEvents: dropMode ? 'auto' : 'none' }}
              />

              {pins.map((pin) => (
                <button
                  key={pin.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePinClick(pin);
                  }}
                  className={`absolute w-8 h-8 rounded-full ${getPinColor(
                    pin.status
                  )} border-2 border-white shadow-lg transform -translate-x-1/2 -translate-y-1/2 hover:scale-110 transition-transform flex items-center justify-center text-white font-bold text-xs`}
                  style={{
                    left: `${pin.x * 100}%`,
                    top: `${pin.y * 100}%`,
                  }}
                  title={pin.member_name || pin.label}
                >
                  <MapPin className="w-4 h-4" />
                </button>
              ))}

              {newPinPos && (
                <div
                  className="absolute w-8 h-8 rounded-full bg-blue-500 border-2 border-white shadow-lg transform -translate-x-1/2 -translate-y-1/2 animate-pulse"
                  style={{
                    left: `${newPinPos.x * 100}%`,
                    top: `${newPinPos.y * 100}%`,
                  }}
                />
              )}
            </div>
          </div>
        )}
      </div>

      {showPinSetup && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="border-b border-slate-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Pin Setup</h3>
              <button
                onClick={() => {
                  setShowPinSetup(false);
                  setNewPinPos(null);
                }}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-600" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Inspection Package *
                </label>
                <select
                  value={pinForm.package_id}
                  onChange={(e) => setPinForm({ ...pinForm, package_id: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {packages.map((pkg) => (
                    <option key={pkg.id} value={pkg.id}>
                      {pkg.name} - {normalizeFRRValue(pkg.frr_minutes)}min - {pkg.required_thickness_value}
                      {pkg.required_thickness_unit}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Steel Member *
                </label>
                <SteelMemberSelect
                  value={pinForm.member_name}
                  memberId={pinForm.steel_member_id}
                  onChange={(member) =>
                    setPinForm({
                      ...pinForm,
                      steel_member_id: member.id,
                      member_name: member.designation,
                    })
                  }
                  placeholder="Search steel member (e.g., 410UB54)..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Pin Label (optional)
                </label>
                <input
                  type="text"
                  value={pinForm.label}
                  onChange={(e) => setPinForm({ ...pinForm, label: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Short label"
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  onClick={handleCreatePin}
                  className="flex-1 px-4 py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
                >
                  Save Pin Only
                </button>
                <button
                  onClick={handleStartInspection}
                  className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm font-medium"
                >
                  Start Inspection
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
