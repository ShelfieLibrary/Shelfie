import { useEffect, useMemo, useRef, useState } from "react";

import { getBookContent } from "../api/books";
import styles from "./BookReader.module.css";
import Button from "./ui/Button";


const SECTION_SIZE = 150;
const HEADING = /^(chapter|book|part|letter|stave|act|section)\b[\s.:]*([ivxlcdm]+|\d+|[a-z-]+)\b.{0,60}$/i;
const supported = typeof window !== "undefined" && "speechSynthesis" in window;
const SPEEDS = [0.75, 1, 1.25, 1.5, 2];
const PREFERRED_VOICE = /natural|online|google/i;


function englishVoices() {
  const voices = window.speechSynthesis.getVoices().filter((voice) => voice.lang.startsWith("en"));
  return voices.sort(
    (a, b) => PREFERRED_VOICE.test(b.name) - PREFERRED_VOICE.test(a.name),
  );
}


function toSentences(text) {
  return text
    .split(/\n\s*\n/)
    .flatMap((paragraph) => {
      const clean = paragraph.replace(/\s+/g, " ").trim();
      if (HEADING.test(clean)) {
        return [{ text: clean, startsParagraph: true, heading: true }];
      }
      const sentences = clean.match(/[^.!?]+[.!?"”’)]*\s*/g) || [];
      return sentences.map((sentence, index) => ({
        text: sentence.trim(),
        startsParagraph: index === 0,
      }));
    })
    .filter((sentence) => sentence.text);
}


function toSections(sentences) {
  const starts = sentences
    .map((sentence, index) => (sentence.heading ? index : -1))
    .filter((index) => index >= 0)
    .filter((index, i, all) => (all[i + 1] ?? sentences.length) - index > 3);

  if (starts.length >= 2) {
    const bounds = starts[0] > 0 ? [0, ...starts] : starts;
    return bounds.map((start, i) => ({
      title: sentences[start].heading ? sentences[start].text : "Opening",
      start,
      end: bounds[i + 1] ?? sentences.length,
    }));
  }

  const sections = [];
  for (let start = 0; start < sentences.length; start += SECTION_SIZE) {
    sections.push({
      title: `Section ${sections.length + 1}`,
      start,
      end: Math.min(start + SECTION_SIZE, sentences.length),
    });
  }
  return sections;
}


function savedPosition(bookId) {
  try {
    return Number(localStorage.getItem(`shelfieListen:${bookId}`)) || 0;
  } catch {
    return 0;
  }
}


function savePosition(bookId, index) {
  try {
    localStorage.setItem(`shelfieListen:${bookId}`, String(index));
  } catch {
    // Position memory is optional.
  }
}


function BookReader({ book, onAvailable }) {
  const [content, setContent] = useState(undefined);
  const [current, setCurrent] = useState(() => savedPosition(book.id));
  const [playing, setPlaying] = useState(false);
  const playingRef = useRef(false);
  const runRef = useRef(0);
  const [voices, setVoices] = useState([]);
  const [voiceName, setVoiceName] = useState("");
  const [speed, setSpeed] = useState(1);
  const activeRef = useRef(null);

  const sentences = useMemo(() => (content ? toSentences(content) : []), [content]);
  const sections = useMemo(() => toSections(sentences), [sentences]);
  const sectionIndex = Math.max(
    0,
    sections.findIndex((section) => current >= section.start && current < section.end),
  );
  const section = sections[sectionIndex];

  useEffect(() => {
    let cancelled = false;
    setContent(undefined);

    getBookContent(book)
      .then((data) => {
        if (cancelled) return;
        setContent(data.available ? data.text : null);
        onAvailable(Boolean(data.available));
      })
      .catch(() => {
        if (!cancelled) setContent(null);
      });

    return () => {
      cancelled = true;
      playingRef.current = false;
      if (supported) window.speechSynthesis.cancel();
    };
  }, [book.id]);

  useEffect(() => {
    if (!supported) return;

    function loadVoices() {
      const available = englishVoices();
      setVoices(available);
      setVoiceName((current) => current || available[0]?.name || "");
    }

    loadVoices();
    window.speechSynthesis.addEventListener("voiceschanged", loadVoices);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", loadVoices);
  }, []);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [current]);

  function speakFrom(index, run) {
    if (run !== runRef.current || !playingRef.current) return;
    if (index >= sentences.length) {
      playingRef.current = false;
      setPlaying(false);
      return;
    }

    setCurrent(index);
    savePosition(book.id, index);

    const utterance = new SpeechSynthesisUtterance(sentences[index].text);
    utterance.voice = voices.find((voice) => voice.name === voiceName) || null;
    utterance.rate = speed;
    utterance.onend = () => speakFrom(index + 1, run);
    window.speechSynthesis.speak(utterance);
  }

  function play(index = current) {
    window.speechSynthesis.cancel();
    playingRef.current = true;
    runRef.current += 1;
    setPlaying(true);
    speakFrom(index, runRef.current);
  }

  function pause() {
    playingRef.current = false;
    runRef.current += 1;
    setPlaying(false);
    window.speechSynthesis.cancel();
  }

  function goToSection(index) {
    const start = sections[index].start;
    if (playing) {
      play(start);
    } else {
      setCurrent(start);
      savePosition(book.id, start);
    }
  }

  function restart() {
    pause();
    setCurrent(0);
    savePosition(book.id, 0);
  }

  if (content === undefined) {
    return (
      <div className={styles.reader}>
        {[60, 100, 92, 97, 70].map((width, index) => (
          <div key={index} className="skeleton" style={{ height: 16, width: `${width}%` }} />
        ))}
      </div>
    );
  }

  if (!content) {
    return (
      <p className={styles.note}>
        Full text and audio are only available for public-domain books.
      </p>
    );
  }

  return (
    <div className={styles.reader}>
      <div className={styles.controls}>
        {supported ? (
          <>
            {playing ? (
              <Button onClick={pause}>⏸ Pause</Button>
            ) : (
              <Button onClick={() => play()}>
                {current > 0 ? "▶ Resume listening" : "🔊 Listen"}
              </Button>
            )}
            {current > 0 && (
              <Button variant="secondary" onClick={restart}>
                ⏮ Start over
              </Button>
            )}
            <select
              className={styles.option}
              value={voiceName}
              onChange={(event) => {
                pause();
                setVoiceName(event.target.value);
              }}
              aria-label="Voice"
            >
              {voices.map((voice) => (
                <option key={voice.name} value={voice.name}>
                  {voice.name}
                </option>
              ))}
            </select>
            <select
              className={styles.option}
              value={speed}
              onChange={(event) => {
                pause();
                setSpeed(Number(event.target.value));
              }}
              aria-label="Speed"
            >
              {SPEEDS.map((value) => (
                <option key={value} value={value}>
                  {value}×
                </option>
              ))}
            </select>
          </>
        ) : (
          <span className={styles.note}>Text-to-speech is not supported in this browser.</span>
        )}
        <span className={styles.progress}>
          {Math.round((current / sentences.length) * 100)}% through
        </span>
      </div>

      <select
        className={styles.chapters}
        value={sectionIndex}
        onChange={(event) => goToSection(Number(event.target.value))}
        aria-label="Chapter"
      >
        {sections.map((item, index) => (
          <option key={item.start} value={index}>
            {item.title}
          </option>
        ))}
      </select>

      <div className={styles.text}>
        {section &&
          sentences.slice(section.start, section.end).map((sentence, offset) => {
            const index = section.start + offset;
            const className = sentence.heading
              ? styles.heading
              : index === current
                ? styles.active
                : styles.sentence;
            return (
              <span key={index}>
                {sentence.startsParagraph && offset > 0 && (
                  <>
                    <br />
                    <br />
                  </>
                )}
                <span
                  ref={index === current ? activeRef : null}
                  className={className}
                  onClick={() => (playing ? play(index) : setCurrent(index))}
                >
                  {sentence.text}{" "}
                </span>
              </span>
            );
          })}
      </div>

      <div className={styles.pager}>
        <Button
          variant="text"
          disabled={sectionIndex === 0}
          onClick={() => goToSection(sectionIndex - 1)}
        >
          ← Previous chapter
        </Button>
        <span>
          {sectionIndex + 1} of {sections.length}
        </span>
        <Button
          variant="text"
          disabled={sectionIndex === sections.length - 1}
          onClick={() => goToSection(sectionIndex + 1)}
        >
          Next chapter →
        </Button>
      </div>
    </div>
  );
}

export default BookReader;
