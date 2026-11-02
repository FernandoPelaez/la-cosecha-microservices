"use client";

import {
  useEffect,
  useRef,
  type KeyboardEvent,
} from "react";
import {
  Check,
  ChevronDown,
  Filter,
  Search,
  X,
} from "lucide-react";

interface OrderFiltersProps {
  search: string;
  status: string;
  statuses: string[];
  statusLabels: Record<string, string>;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: string) => void;
}

export function OrderFilters({
  search,
  status,
  statuses,
  statusLabels,
  onSearchChange,
  onStatusChange,
}: OrderFiltersProps) {
  const dropdownRef = useRef<HTMLDetailsElement>(null);

  const statusOptions = [
    {
      value: "all",
      label: "Todos los estados",
    },
    ...statuses.map((value) => ({
      value,
      label: statusLabels[value] || value,
    })),
  ];

  const selectedLabel =
    statusOptions.find((option) => option.value === status)
      ?.label || "Todos los estados";

  useEffect(() => {
    function handleOutsideClick(event: PointerEvent) {
      const dropdown = dropdownRef.current;

      if (
        dropdown &&
        !dropdown.contains(event.target as Node)
      ) {
        dropdown.open = false;
      }
    }

    document.addEventListener(
      "pointerdown",
      handleOutsideClick,
    );

    return () => {
      document.removeEventListener(
        "pointerdown",
        handleOutsideClick,
      );
    };
  }, []);

  function selectStatus(value: string) {
    onStatusChange(value);

    if (dropdownRef.current) {
      dropdownRef.current.open = false;
    }
  }

  function handleEscape(
    event: KeyboardEvent<HTMLDetailsElement>,
  ) {
    if (event.key !== "Escape") return;

    event.preventDefault();

    if (dropdownRef.current) {
      dropdownRef.current.open = false;
      dropdownRef.current
        .querySelector("summary")
        ?.focus();
    }
  }

  return (
    <div className="mb-5 grid w-full grid-cols-1 gap-3 md:ml-auto md:max-w-150 md:grid-cols-[minmax(0,1fr)_240px]">
      <div className="relative min-w-0">
        <label
          htmlFor="orders-search"
          className="sr-only"
        >
          Buscar por número de pedido o producto
        </label>

        <input
          id="orders-search"
          type="search"
          autoComplete="off"
          value={search}
          onChange={(event) =>
            onSearchChange(event.target.value)
          }
          style={{ outline: "none", boxShadow: "none" }}
          placeholder="Buscar por número de pedido o producto..."
          className={`h-11 w-full min-w-0 rounded-full border border-(--border) bg-(--surface) pl-5 text-sm text-(--text-primary) transition-colors placeholder:text-(--text-secondary) focus:border-2 focus:border-(--brand-secondary) focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 [&::-webkit-search-cancel-button]:hidden ${
            search ? "pr-20" : "pr-12"
          }`}
        />

        {search && (
          <button
            type="button"
            aria-label="Limpiar búsqueda"
            onClick={() => onSearchChange("")}
            className="absolute top-1/2 right-10 flex size-7 -translate-y-1/2 items-center justify-center rounded-full text-(--text-secondary) hover:text-(--brand-secondary) focus-visible:outline-2 focus-visible:outline-(--brand-secondary)"
          >
            <X
              size={17}
              strokeWidth={1.8}
              aria-hidden="true"
            />
          </button>
        )}

        <Search
          size={19}
          strokeWidth={1.8}
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-(--brand-secondary)"
        />
      </div>

      <details
        ref={dropdownRef}
        onKeyDown={handleEscape}
        onBlur={(event) => {
          if (
            !event.currentTarget.contains(
              event.relatedTarget,
            )
          ) {
            event.currentTarget.open = false;
          }
        }}
        className="group relative min-w-0"
      >
        <summary
          aria-label={`Filtrar pedidos: ${selectedLabel}`}
          className="flex h-11 cursor-pointer list-none items-center gap-3 rounded-full border border-(--border) bg-(--surface) px-4 text-sm font-medium text-(--text-primary) transition-colors group-open:border-(--brand-secondary) focus:border-2 focus:border-(--brand-secondary) focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 [&::-webkit-details-marker]:hidden"
        >
          <Filter
            size={17}
            strokeWidth={1.8}
            aria-hidden="true"
            className="shrink-0 text-(--brand-secondary)"
          />

          <span className="min-w-0 flex-1 truncate">
            {selectedLabel}
          </span>

          <ChevronDown
            size={17}
            strokeWidth={1.8}
            aria-hidden="true"
            className="shrink-0 text-(--brand-secondary) group-open:rotate-180"
          />
        </summary>

        <div
          role="group"
          aria-label="Opciones de estado"
          className="absolute top-full right-0 z-30 mt-2 w-full overflow-hidden rounded-xl border border-(--border) bg-(--surface) p-1 shadow-md"
        >
          {statusOptions.map((option) => {
            const isSelected =
              status === option.value;

            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={isSelected}
                onClick={() =>
                  selectStatus(option.value)
                }
                className={`flex min-h-10 w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors focus-visible:outline-2 focus-visible:outline-(--brand-secondary) ${
                  isSelected
                    ? "bg-(--surface-soft) font-semibold text-(--brand-secondary)"
                    : "text-(--text-primary) hover:bg-(--surface-soft)"
                }`}
              >
                <span className="min-w-0 truncate">
                  {option.label}
                </span>

                {isSelected && (
                  <Check
                    size={16}
                    strokeWidth={1.8}
                    aria-hidden="true"
                    className="shrink-0 text-(--brand-secondary)"
                  />
                )}
              </button>
            );
          })}
        </div>
      </details>
    </div>
  );
}
