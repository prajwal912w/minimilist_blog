import React from 'react';
import { NavLink, Route, Routes } from 'react-router-dom';
import { Closing, FileCard, Group, Header, Text, Heading, Paragraph, Bullets, KeySentence, Facts } from './components';
const Link = NavLink;
import './base.css';
import './style.css';
import prajwalAvatar from './assets/prajwal-pixel-avatar.jpg';

const github = 'https://github.com/prajwal912w';
const anomalyRepo = 'https://github.com/prajwal912w/anomaly-ids-ai';
const email = 'mailto:shindeprajwal912@gmail.com';
const xProfile = 'https://x.com/Prajwalshindee';
const linkedin = 'https://www.linkedin.com/in/prajwal-shinde-912ps/';

function Home() {
    return <>
        <Group label="Hello" heading>
            <Text>
                <KeySentence>I'm Prajwal Shinde, a computer science student who likes turning messy technical problems into software people can actually use.</KeySentence>
                <Paragraph>Most of my work starts on the server side, then reaches into machine learning when it genuinely helps. Time spent testing systems for weaknesses has also made me careful about inputs, permissions and the ways software can fail.</Paragraph>
            </Text>
        </Group>
        <Group label="Current focus" heading>
            <Text>
                <Bullets items={[
                    'Data structures and algorithms for stronger problem-solving.',
                    'Python and PostgreSQL for dependable backend foundations.',
                    'Building toward APIs, deployed projects and practical AI features.'
                ]} />
            </Text>
        </Group>
        <Group label="Working with" heading>
            <Facts items={[
                { label: 'Languages', value: 'Python, Java' },
                { label: 'Backend', value: 'Flask, PostgreSQL, REST APIs, Docker' },
                { label: 'Applied AI', value: 'LLM APIs, RAG, vector databases' },
                { label: 'Security', value: 'VAPT, Kali Linux, Metasploit, MITRE ATT&CK' }
            ]} />
        </Group>
        <Group label="Direction" heading>
            <Text>
                <Paragraph>My approach is to keep responsibilities clear, make failure states visible and treat AI as one part of a larger system. I want each project to show why its choices were made, how it was tested and where it can improve.</Paragraph>
            </Text>
        </Group>
    </>;
}

function Projects() {
    return <>
        <Group label="Featured project" heading>
            <Text>
                <KeySentence>Anomaly-based intrusion detection system</KeySentence>
                <Paragraph>A Python prototype that captures network packets and uses an Isolation Forest model to flag unusual traffic. It includes severity-based alerts, live logs and visualisation, a desktop dashboard, simulated traffic for demos, and optional Groq-powered threat summaries with MITRE ATT&CK mapping.</Paragraph>
                <Facts items={[
                    { label: 'Stack', value: 'Python, Scapy, scikit-learn, Tkinter, Matplotlib' },
                    { label: 'Model', value: 'Isolation Forest' },
                    { label: 'Status', value: 'Prototype' }
                ]} />
                <Paragraph><a href={anomalyRepo} target="_blank" rel="noreferrer">View the source on GitHub</a> · <Link to="/notes/anomaly-detection">Read the build note</Link></Paragraph>
            </Text>
        </Group>
        <Group label="Building next" heading>
            <Text>
                <Paragraph>I'm developing more work that shows backend depth, clear product thinking and thoughtful use of AI. Each public project will be added here once it is ready to inspect, with its code, live demo and the engineering decisions behind it.</Paragraph>
                <Heading>What I care about</Heading>
                <Bullets items={[
                    'Useful problems, not feature checklists.',
                    'Clean APIs, data models, tests and error handling.',
                    'AI features with citations, evaluation and sensible fallbacks.',
                    'A working deployment and a README that explains the tradeoffs.'
                ]} />
                <Paragraph><a href={github} target="_blank" rel="noreferrer">Follow my work on GitHub</a>.</Paragraph>
            </Text>
        </Group>
    </>;
}

function Notes() {
    return <>
        <Group label="Notes" heading>
            <div className="note-list">
                <Link className="note-link" to="/notes/anomaly-detection">
                    <strong>Building an anomaly-based intrusion detector</strong>
                    <span>From packet features to useful alerts, and what the prototype taught me.</span>
                </Link>
                <Link className="note-link" to="/notes/useful-ai-projects">
                    <strong>What I want a useful AI project to prove</strong>
                    <span>A practical checklist for moving beyond a model demo.</span>
                </Link>
            </div>
        </Group>
    </>;
}

function AnomalyNote() {
    return <>
        <Group label="Build note" heading>
            <Text>
                <KeySentence>Building an anomaly-based intrusion detector</KeySentence>
                <Paragraph>The problem is simple to state: suspicious network behaviour does not always match a known signature. I wanted to explore whether a model trained around normal traffic could surface unusual packets for closer inspection.</Paragraph>
                <Heading>Approach</Heading>
                <Paragraph>The prototype extracts packet size, protocol and source and destination ports. A saved scaler prepares those values for an Isolation Forest model, which returns either normal or anomalous. The interface turns that output into live logs, counters, a traffic graph and severity-based alerts.</Paragraph>
                <Heading>Technical decisions</Heading>
                <Bullets items={[
                    'Scapy handles live packet capture, while simulated traffic keeps the demo usable when capture is unavailable.',
                    'A background worker keeps optional Groq threat analysis from blocking the Tkinter interface.',
                    'MITRE ATT&CK mappings add context to recognised demo attack profiles.',
                    'The API key is read from an environment variable rather than stored in the repository.'
                ]} />
                <Heading>What I learned</Heading>
                <Paragraph>An anomaly score is only the start of an IDS. Feature quality, thresholds, false positives and clear operator context decide whether an alert is useful. The next meaningful improvements are a reproducible training pipeline, stronger evaluation with precision and recall, clearer separation between simulated and captured traffic, and tests around feature extraction and alert logic.</Paragraph>
                <Paragraph><a href={anomalyRepo} target="_blank" rel="noreferrer">Source code</a> · <Link to="/notes">Back to Notes</Link></Paragraph>
            </Text>
        </Group>
    </>;
}

function UsefulAiNote() {
    return <>
        <Group label="Engineering note" heading>
            <Text>
                <KeySentence>What I want a useful AI project to prove</KeySentence>
                <Paragraph>A model or API call can make a demo interesting, but it does not make the surrounding system dependable. The engineering around the model is where a project becomes useful.</Paragraph>
                <Heading>My checklist</Heading>
                <Bullets items={[
                    'Start with a clear user problem and define what a good result means.',
                    'Make data flow visible: inputs, transformations, model output and final action.',
                    'Evaluate with examples that include failures, not only a successful demo.',
                    'Handle timeouts, missing data and unavailable model services without breaking the product.',
                    'Keep secrets out of source code and log enough context to debug safely.',
                    'Explain tradeoffs, cost and latency in the README.'
                ]} />
                <Heading>Why this matters to me</Heading>
                <Paragraph>My current direction combines backend engineering with applied AI. That means I want future projects to show both sides: a thoughtful AI feature and the APIs, data, testing, fallbacks and deployment work that make it trustworthy.</Paragraph>
                <Paragraph><Link to="/notes">Back to Notes</Link></Paragraph>
            </Text>
        </Group>
    </>;
}

function About() {
    return <>
        <Group label="About me" heading>
            <Text>
                <KeySentence>I enjoy the parts of software that happen behind the screen: data, APIs, system behaviour and the decisions that keep everything predictable.</KeySentence>
                <Paragraph>I'm a computer science student in India. Python is my main building language, Java is part of my foundation, and I use Flask, PostgreSQL, REST APIs and Docker to turn ideas into working services.</Paragraph>
                <Paragraph>For AI work, I'm learning how retrieval, vector search and language-model APIs fit into real products. My earlier VAPT work, including Kali Linux and Metasploit, keeps security in the conversation from the beginning.</Paragraph>
                <Paragraph>I want every project here to be understandable, testable and honest about what still needs work.</Paragraph>
            </Text>
        </Group>
        <Group label="Contact" heading>
            <Text><Paragraph><a href={github} target="_blank" rel="noreferrer">GitHub</a> · <a href={linkedin} target="_blank" rel="noreferrer">LinkedIn</a> · <a href={xProfile} target="_blank" rel="noreferrer">X</a> · <a href={email}>Email</a></Paragraph></Text>
        </Group>
    </>;
}

export function App() {
    return <FileCard>
        <div className="site-identity">
            <img className="developer-mark" src={prajwalAvatar} alt="Pixel-art avatar of Prajwal holding a steaming mug" />
            <div><Header title="Prajwal Shinde" fact="Backend engineering · Applied AI" /></div>
        </div>
        <p className="site-tagline">I like simple interfaces backed by careful engineering.</p>
        <nav className="file-nav" aria-label="Site pages">
            <NavLink to="/" end>Home</NavLink>
            <NavLink to="/projects">Projects</NavLink>
            <NavLink to="/notes">Notes</NavLink>
            <NavLink to="/about">About</NavLink>
        </nav>
        <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/notes" element={<Notes />} />
            <Route path="/notes/anomaly-detection" element={<AnomalyNote />} />
            <Route path="/notes/useful-ai-projects" element={<UsefulAiNote />} />
            <Route path="/about" element={<About />} />
        </Routes>
        <Closing>Temporary personal site. More work will be added as it is ready.</Closing>
    </FileCard>;
}
