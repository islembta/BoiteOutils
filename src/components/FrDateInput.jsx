import React from 'react';
import DatePicker, { registerLocale } from 'react-datepicker';
import { fr } from 'date-fns/locale';
import 'react-datepicker/dist/react-datepicker.css';
import { parseISO, format } from 'date-fns';
import { X } from 'lucide-react';

// Register French locale globally
registerLocale('fr', fr);

/**
 * FrDateInput — date picker fully localized in French.
 * Props:
 *   value       : string 'YYYY-MM-DD' or ''
 *   onChange    : (newValue: string) => void   (newValue is 'YYYY-MM-DD' or '')
 *   placeholder : string (optional)
 *   className   : string (optional, applied to wrapper)
 *   inputClass  : string (optional, applied to the <input>)
 */
export default function FrDateInput({ value, onChange, placeholder, className = '', inputClass = '' }) {
    const selected = value ? parseISO(value) : null;

    const handleChange = (date) => {
        if (!date) { onChange(''); return; }
        onChange(format(date, 'yyyy-MM-dd'));
    };

    return (
        <div className={`relative group ${className}`}>
            <DatePicker
                selected={selected}
                onChange={handleChange}
                locale="fr"
                dateFormat="dd/MM/yyyy"
                placeholderText={placeholder || 'jj/mm/aaaa'}
                showPopperArrow={false}
                popperPlacement="bottom-start"
                className={`w-full rounded-lg border-slate-300 shadow-sm p-2.5 pr-10 border outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm ${inputClass}`}
                calendarClassName="fr-calendar"
                weekDayClassName={() => 'text-slate-500'}
                showWeekNumbers={false}
            />
            {value && (
                <button
                    type="button"
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onChange('');
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-all active:scale-90"
                    title="Effacer la date"
                >
                    <X className="w-3.5 h-3.5" />
                </button>
            )}
        </div>
    );
}
