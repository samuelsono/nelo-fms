export default function GrafanaPanel({ panelUrl }:{ panelUrl: string }) {
  return (
    <iframe
      src={panelUrl}
      width="100%"
      height="100%"
      sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
      title="Grafana Panel"
    />
  );
}
