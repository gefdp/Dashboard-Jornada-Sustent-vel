import { RotateCcw, SlidersHorizontal } from "lucide-react";
import type { SelectOption } from "../types";
import { ALL_VALUE } from "../utils/data";

export interface FilterConfig {
  key: string;
  label: string;
  value: string;
  options: SelectOption[];
}

interface FilterBarProps {
  filters: FilterConfig[];
  onChange: (key: string, value: string) => void;
  onClear: () => void;
  inline?: boolean;
}

export function FilterBar({ filters, onChange, onClear, inline }: FilterBarProps) {
  if (inline) {
    return (
      <div className="filter-inline" aria-label="Filtros do painel">
        <SlidersHorizontal size={15} className="filter-inline__icon" aria-hidden="true" />
        {filters.map((filter) => (
          <label key={filter.key} className="filter-inline__field">
            <span>{filter.label}</span>
            <select value={filter.value} onChange={(event) => onChange(filter.key, event.target.value)}>
              <option value={ALL_VALUE}>Todos</option>
              {filter.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        ))}
        <button className="filter-inline__clear" type="button" onClick={onClear} title="Limpar filtros">
          <RotateCcw size={14} aria-hidden="true" />
        </button>
      </div>
    );
  }

  return (
    <section className="filter-bar" aria-label="Filtros do painel">
      <div className="filter-bar__title">
        <SlidersHorizontal size={18} aria-hidden="true" />
        <span>Filtros</span>
      </div>
      <div className="filter-bar__controls">
        {filters.map((filter) => (
          <label key={filter.key} className="field">
            <span>{filter.label}</span>
            <select value={filter.value} onChange={(event) => onChange(filter.key, event.target.value)}>
              <option value={ALL_VALUE}>Todos</option>
              {filter.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        ))}
        <button className="icon-button icon-button--text" type="button" onClick={onClear} title="Limpar filtros">
          <RotateCcw size={17} aria-hidden="true" />
          Limpar
        </button>
      </div>
    </section>
  );
}
