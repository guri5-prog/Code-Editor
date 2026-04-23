import { useParams } from 'react-router-dom';
import App from '../App';
import { ProjectHeader } from '../components/Project/ProjectHeader';

export function ProjectView() {
  const { id } = useParams<{ id: string }>();
  if (!id) return <div style={errorStyle}>Missing project id</div>;

  return (
    <div style={wrapperStyle}>
      <ProjectHeader projectId={id} />
      <div style={editorAreaStyle}>
        <App projectId={id} />
      </div>
    </div>
  );
}

const wrapperStyle: React.CSSProperties = {
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
};

const editorAreaStyle: React.CSSProperties = {
  flex: 1,
  minHeight: 0,
};

const errorStyle: React.CSSProperties = {
  padding: '24px',
  color: 'var(--error)',
};
