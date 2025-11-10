import React from 'react';

export function ToolTile({
  icon,
  title,
  blurb,
  onOpen,
  footer,
}: {
  icon: string;
  title: string;
  blurb: string;
  onOpen: () => void;
  footer?: React.ReactNode;
}) {
  return (
    <div className="tile">
      <div className="tile-head">
        <div className="tile-icon" aria-hidden>{icon}</div>
        <div className="tile-title">{title}</div>
      </div>
      <div className="tile-body">{blurb}</div>
      <div className="tile-foot">
        {footer}
        <div className="grow" />
        <button className="primary" onClick={onOpen}>Open</button>
      </div>
    </div>
  );
}

