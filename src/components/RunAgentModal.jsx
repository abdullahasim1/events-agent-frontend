import { useState } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import { Play, Sparkles, CheckCircle2, Clock, AlertCircle, Calendar, MapPin, Tag } from "lucide-react";
import { searchEventsBatch } from "../services/api";
import { Modal, Button, Input, Select } from "./common";

const DEFAULT_LOCATIONS = ["United States", "Pakistan", "United Kingdom", "New York", "London", "Dubai"];
const DEFAULT_TYPES = ["Conferences", "Health Fairs", "5K Races", "Silent Auctions", "Galas & Golf", "Wellness"];
const DURATIONS = [
  { value: 7, label: "7 Days Ahead" },
  { value: 14, label: "14 Days Ahead" },
  { value: 30, label: "30 Days Ahead" },
  { value: 60, label: "60 Days Ahead" },
];

const parseList = (str) => (str || "").split(",").map((s) => s.trim()).filter(Boolean);
const toggleItem = (curr, item) => {
  const list = parseList(curr);
  const exists = list.some((s) => s.toLowerCase() === item.toLowerCase());
  return exists
    ? list.filter((s) => s.toLowerCase() !== item.toLowerCase()).join(", ")
    : [...list, item].join(", ");
};

const QuickPills = ({ items, selected, onToggle }) => {
  const selectedLow = parseList(selected).map((s) => s.toLowerCase());
  return (
    <div className="flex flex-wrap items-center gap-1.5 mt-2">
      <span className="text-[10px] text-zinc-400 mr-1">Quick add:</span>
      {items.map((item) => {
        const isSel = selectedLow.includes(item.toLowerCase());
        return (
          <button
            key={item}
            type="button"
            onClick={() => onToggle(item)}
            className={`text-[11px] px-2 py-0.5 rounded-md border transition-all cursor-pointer capitalize ${
              isSel ? "bg-[#82aa92] text-[#141c17] font-semibold border-[#82aa92]" : "bg-white text-zinc-600 border-gray-200 hover:bg-gray-50"
            }`}
          >
            {isSel ? `✓ ${item}` : `+ ${item}`}
          </button>
        );
      })}
    </div>
  );
};

const validationSchema = Yup.object({
  city: Yup.string().trim().required("Location or city is required"),
  type: Yup.string().trim().required("Event type or category is required"),
  startDate: Yup.string().required("Start date is required"),
  days: Yup.number().required().min(1, "Minimum 1 day").max(365, "Maximum 365 days"),
});

const TODAY = new Date().toISOString().slice(0, 10);

const RunAgentModal = ({ isOpen, onClose, onAgentSuccess, initialCity = "", initialType = "" }) => {
  const [status, setStatus] = useState(null);

  const formik = useFormik({
    initialValues: {
      city: initialCity || "",
      type: initialType || "",
      startDate: TODAY,
      days: 14,
    },
    validationSchema,
    enableReinitialize: true,
    onSubmit: async (values, { setSubmitting }) => {
      const cities = parseList(values.city);
      const types = parseList(values.type);
      setStatus(null);

      try {
        const events = await searchEventsBatch({
          cities,
          types,
          startDate: values.startDate,
          days: values.days,
        });

        const msg = events.length ? `Found ${events.length} events across ${cities.join(", ")}!` : `No events found.`;
        setStatus({ err: false, msg });

        if (events.length) {
          if (onAgentSuccess) onAgentSuccess(events);
          onClose();
        }
      } catch (err) {
        setStatus({ err: true, msg: err.message || "Search failed." });
      } finally {
        setSubmitting(false);
      }
    },
  });

  if (!isOpen) return null;

  const field = (name) => ({
    ...formik.getFieldProps(name),
    error: formik.touched[name] && formik.errors[name],
    disabled: formik.isSubmitting,
  });

  return (
    <Modal isOpen={isOpen} onClose={onClose} icon={Sparkles} title="Run Events Agent" subtitle="Multi-Location & Multi-Category Live Discovery">
      <form onSubmit={formik.handleSubmit}>
        <div className="p-6 space-y-4">
          <div>
            <Input
              label="Location(s) — City or Country"
              hint="Comma-separated"
              icon={MapPin}
              required
              placeholder="e.g. United States, Pakistan, New York, London"
              {...field("city")}
            />
            <QuickPills
              items={DEFAULT_LOCATIONS}
              selected={formik.values.city}
              onToggle={(c) => formik.setFieldValue("city", toggleItem(formik.values.city, c))}
            />
          </div>

          <div>
            <Input
              label="Event Type(s) / Category"
              hint="Comma-separated"
              icon={Tag}
              required
              placeholder="e.g. Conferences, Health Fairs, Silent Auctions, Galas"
              {...field("type")}
            />
            <QuickPills
              items={DEFAULT_TYPES}
              selected={formik.values.type}
              onToggle={(t) => formik.setFieldValue("type", toggleItem(formik.values.type, t))}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input label="Start Date" icon={Calendar} type="date" {...field("startDate")} />
            <Select
              label="Duration Window"
              icon={Clock}
              name="days"
              value={formik.values.days}
              onChange={(e) => formik.setFieldValue("days", Number(e.target.value))}
              disabled={formik.isSubmitting}
              options={DURATIONS}
            />
          </div>

          {status && (
            <div className={`p-3 rounded-xl border flex items-center gap-2 text-xs ${status.err ? "bg-red-50 border-red-200 text-red-700" : "bg-emerald-50 border-emerald-200 text-emerald-800"}`}>
              {status.err ? <AlertCircle className="w-4 h-4 text-red-500 shrink-0" /> : <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
              <span>{status.msg}</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-t border-gray-100">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={formik.isSubmitting}>
            Close
          </Button>
          <Button type="submit" variant="primary" loading={formik.isSubmitting} icon={!formik.isSubmitting ? Play : undefined} className="px-5 font-bold">
            {formik.isSubmitting ? "Agent Searching..." : "Run Agent Now"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default RunAgentModal;
