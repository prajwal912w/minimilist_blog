import React, { type ReactNode } from 'react';

export function FileCard({ children }: { children: ReactNode }) {
    return <main className="file-card">{children}</main>;
}

export function Header({ title, fact, intro }: { title: string; fact?: string; intro?: string }) {
    return <section className="header-block">
        <h1>{title}</h1>
        {fact && <p className="header-fact">{fact}</p>}
        {intro && <p className="header-intro">{intro}</p>}
    </section>;
}

export function Group({ label, children, heading = false }: { label: string; children: ReactNode; heading?: boolean }) {
    return <section className="group">
        {heading ? <h2 className="group-heading">{label}</h2> : <p className="group-label">{label}</p>}
        <div className="group-content">{children}</div>
    </section>;
}

export function Text({ children }: { children: ReactNode }) { return <div className="text">{children}</div>; }
export function Heading({ children }: { children: ReactNode }) { return <h3 className="text-heading">{children}</h3>; }
export function Paragraph({ children }: { children: ReactNode }) { return <p>{children}</p>; }
export function KeySentence({ children }: { children: ReactNode }) { return <p className="key-sentence">{children}</p>; }
export function Bullets({ items }: { items: string[] }) { return <ul className="bullets">{items.map((item) => <li key={item}>{item}</li>)}</ul>; }
export function Facts({ items }: { items: { label: string; value: string }[] }) {
    return <dl className="facts">{items.map((item) => <div className="fact" key={item.label}><dt>{item.label}</dt><dd>{item.value}</dd></div>)}</dl>;
}
export function Closing({ children }: { children: ReactNode }) { return <footer className="closing">{children}</footer>; }
