/**
 * Decorative background. Deliberately static: it used to follow the pointer
 * (rewriting CSS variables on <html> on every mouse move, which restyled the
 * whole page) and animate three blurred layers forever, which cost battery on
 * phones for no information.
 */
export default function BackgroundField() {
  return (
    <div className="bg-field" aria-hidden="true">
      <div className="bg-orb orb-1" />
      <div className="bg-orb orb-2" />
      <div className="bg-orb orb-3" />
      <div className="bg-grid" />
      <div className="bg-noise" />
    </div>
  );
}
