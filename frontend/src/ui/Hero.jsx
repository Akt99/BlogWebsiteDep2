export default function Hero({ title, subtitle, imageUrl }) {
  return (
    <header
      className="hero"
      style={{ backgroundImage: `url(${imageUrl})` }}
      role="img"
      aria-label={title}
    >
      <div className="hero__overlay" />
      <div className="hero__inner container">
        <p className="hero__kicker">Travel Blog</p>
        <h1 className="hero__title">{title}</h1>
        {subtitle && <p className="hero__subtitle">{subtitle}</p>}
      </div>
    </header>
  );
}
