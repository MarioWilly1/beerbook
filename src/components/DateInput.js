import { useState, useRef } from "react";

const DateInput = ({ onChange }) => {
  const [day, setDay] = useState("");
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");
  const monthRef = useRef();
  const yearRef = useRef();

  const notify = (d, m, y) => {
    if (d.length === 2 && m.length === 2 && y.length === 4) {
      onChange(`${y}-${m}-${d}`);
    } else {
      onChange("");
    }
  };

  const handleDay = (e) => {
    const v = e.target.value.replace(/\D/g, "").slice(0, 2);
    setDay(v);
    notify(v, month, year);
    if (v.length === 2) monthRef.current?.focus();
  };

  const handleMonth = (e) => {
    const v = e.target.value.replace(/\D/g, "").slice(0, 2);
    setMonth(v);
    notify(day, v, year);
    if (v.length === 2) yearRef.current?.focus();
  };

  const handleYear = (e) => {
    const v = e.target.value.replace(/\D/g, "").slice(0, 4);
    setYear(v);
    notify(day, month, v);
  };

  return (
    <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
      <input
        type="text"
        inputMode="numeric"
        placeholder="DD"
        value={day}
        onChange={handleDay}
        maxLength={2}
        style={{ ...field, width: "62px" }}
      />
      <span style={sep}>/</span>
      <input
        ref={monthRef}
        type="text"
        inputMode="numeric"
        placeholder="MM"
        value={month}
        onChange={handleMonth}
        maxLength={2}
        style={{ ...field, width: "62px" }}
      />
      <span style={sep}>/</span>
      <input
        ref={yearRef}
        type="text"
        inputMode="numeric"
        placeholder="AAAA"
        value={year}
        onChange={handleYear}
        maxLength={4}
        style={{ ...field, width: "96px" }}
      />
    </div>
  );
};

const field = {
  padding: "11px 0",
  border: "1.5px solid #e0e0e0",
  borderRadius: "10px",
  fontSize: "16px",
  outline: "none",
  color: "#111",
  background: "#fff",
  textAlign: "center",
  boxSizing: "border-box",
};

const sep = {
  color: "#ccc",
  fontSize: "20px",
  lineHeight: 1,
  userSelect: "none",
  flexShrink: 0,
};

export default DateInput;
