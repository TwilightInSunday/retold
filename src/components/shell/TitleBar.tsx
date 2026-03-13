interface TitleBarProps {
  title?: string;
}

export function TitleBar({ title = 'RETRO.DO' }: TitleBarProps) {
  return (
    <div className="title-bar" role="banner">
      <div className="title-bar__dots">
        <span className="title-bar__dot title-bar__dot--close" />
        <span className="title-bar__dot title-bar__dot--minimize" />
        <span className="title-bar__dot title-bar__dot--maximize" />
      </div>
      <h1 className="title-bar__title">{title}</h1>
      <div className="title-bar__spacer" />
    </div>
  );
}
