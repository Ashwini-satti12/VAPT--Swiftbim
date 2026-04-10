import { useState, useEffect } from "react";

/** Value is 24h "HH:mm" (e.g. "15:00"). */
export function TimePickerWheel({
  value,
  onChange,
  onClose,
}: {
  value: string;
  onChange: (value: string) => void;
  onClose?: () => void;
}) {
  const [hour12, setHour12] = useState(12);
  const [minute, setMinute] = useState(0);
  const [ampm, setAmpm] = useState<"AM" | "PM">("AM");

  const hours = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  const minutes = Array.from({ length: 60 }, (_, i) => i);
  const ampms: ("AM" | "PM")[] = ["AM", "PM"];

  useEffect(() => {
    if (!value || !value.match(/^\d{1,2}:\d{2}$/)) return;
    const [hStr, mStr] = value.split(":");
    const h24 = parseInt(hStr, 10);
    const m = parseInt(mStr, 10);
    setMinute(minutes.includes(m) ? m : 0);
    if (h24 === 0) {
      setHour12(12);
      setAmpm("AM");
    } else if (h24 < 12) {
      setHour12(h24);
      setAmpm("AM");
    } else if (h24 === 12) {
      setHour12(12);
      setAmpm("PM");
    } else {
      setHour12(h24 - 12);
      setAmpm("PM");
    }
  }, [value]);

  // const to24h = () => {
  //   let h24 = hour12;
  //   if (ampm === "AM" && hour12 === 12) h24 = 0;
  //   else if (ampm === "PM" && hour12 !== 12) h24 = hour12 + 12;
  //   return `${String(h24).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  // };

  const handleSelect = (
    newHour12?: number,
    newMin?: number,
    newAmpm?: "AM" | "PM",
  ) => {
    const h = newHour12 ?? hour12;
    const m = newMin ?? minute;
    const a = newAmpm ?? ampm;
    let h24 = h;
    if (a === "AM" && h === 12) h24 = 0;
    else if (a === "PM" && h !== 12) h24 = h + 12;
    const next = `${String(h24).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    onChange(next);
    if (newHour12 !== undefined) setHour12(newHour12);
    if (newMin !== undefined) setMinute(newMin);
    if (newAmpm !== undefined) setAmpm(newAmpm);
  };

  return (
    <div className="bg-[#F5F5F5] rounded-lg p-3 border border-slate-200 shadow-lg min-w-[200px]">
      <style>{`
        .time-picker-wheel-invisible-scroll {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .time-picker-wheel-invisible-scroll::-webkit-scrollbar {
          display: none;
        }
      `}</style>
      <div className="flex items-stretch gap-0">
        {/* Hours */}
        <div className="time-picker-wheel-invisible-scroll flex-1 flex flex-col max-h-[180px] overflow-y-auto py-1">
          {hours.map((h) => (
            <button
              key={h}
              type="button"
              onClick={() => handleSelect(h, undefined, undefined)}
              className={`py-1.5 text-center text-sm transition-colors cursor-pointer ${
                hour12 === h
                  ? "font-bold text-black"
                  : "text-[#9CA3AF] hover:text-[#6B7280]"
              }`}
            >
              {h}
            </button>
          ))}
        </div>
        <span className="text-black font-bold self-center px-0.5">:</span>
        {/* Minutes */}
        <div className="time-picker-wheel-invisible-scroll flex-1 flex flex-col max-h-[180px] overflow-y-auto py-1">
          {minutes.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => handleSelect(undefined, m, undefined)}
              className={`py-1.5 text-center text-sm transition-colors cursor-pointer ${
                minute === m
                  ? "font-bold text-black"
                  : "text-[#9CA3AF] hover:text-[#6B7280]"
              }`}
            >
              {String(m).padStart(2, "0")}
            </button>
          ))}
        </div>
        {/* AM/PM */}
        <div className="time-picker-wheel-invisible-scroll flex-1 flex flex-col max-h-[180px] overflow-y-auto py-1">
          {ampms.map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => handleSelect(undefined, undefined, a)}
              className={`py-1.5 text-center text-sm transition-colors cursor-pointer ${
                ampm === a
                  ? "font-bold text-black"
                  : "text-[#9CA3AF] hover:text-[#6B7280]"
              }`}
            >
              {a}
            </button>
          ))}
        </div>
      </div>
      {onClose && (
        <div className="mt-2 pt-2 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="text-sm font-medium text-[#353535] hover:text-black cursor-pointer"
          >
            Done
          </button>
        </div>
      )}
    </div>
  );
}
