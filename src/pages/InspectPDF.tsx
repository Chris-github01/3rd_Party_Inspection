import { useParams } from 'react-router-dom';
import { InspectPDFWorkspace } from '../components/inspectpdf/InspectPDFWorkspace';

export default function InspectPDF() {
  const { projectId, workspaceId } = useParams<{ projectId: string; workspaceId: string }>();

  if (!projectId || !workspaceId) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center text-red-600">
          <p className="text-lg font-semibold mb-2">Invalid Parameters</p>
          <p>Missing project ID or workspace ID</p>
        </div>
      </div>
    );
  }

  return <InspectPDFWorkspace workspaceId={workspaceId} projectId={projectId} />;
}
