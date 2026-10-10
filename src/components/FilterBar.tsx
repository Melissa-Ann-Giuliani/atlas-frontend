import { useState, useRef, useEffect } from 'react';
import { FiFilter, FiSearch, FiX, FiChevronLeft } from "react-icons/fi";
import './FilterBar.css';

const FilterIcon = () => (
  <FiFilter size={16} />
);

const SearchIcon = () => (
  <FiSearch size={16} />
);

const CloseIcon = () => (
  <FiX size={14} />
);

const BackIcon = () => (
  <FiChevronLeft size={14} />
);


export interface FilterOption {
  id: string;
  label: string;
}

export interface FilterCategory {
  id: string;
  name: string;
  options: FilterOption[];
}

interface FilterBarProps {
  availableFilters?: FilterCategory[];
  appliedFilters?: string[];
  onAddFilter?: (filter: string) => void;
  onRemoveFilter?: (filter: string) => void;
  onSearch?: (searchTerm: string) => void;
}

export default function FilterBar({
  availableFilters = [],
  appliedFilters = [],
  onAddFilter,
  onRemoveFilter,
  onSearch
}: FilterBarProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
        setActiveCategoryId(null); // reset category when closing
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleFilterSelect = (categoryName: string, optionLabel: string) => {
    if (onAddFilter) {
      // Combining category and option for the chip text
      onAddFilter(`${categoryName}: ${optionLabel}`);
    }
    setIsDropdownOpen(false);
    setActiveCategoryId(null);
  };

  const handleToggleDropdown = () => {
    if (isDropdownOpen) {
      setIsDropdownOpen(false);
      setActiveCategoryId(null);
    } else {
      setIsDropdownOpen(true);
    }
  };

  const activeCategory = availableFilters.find(c => c.id === activeCategoryId);

  return (
    <div className="filter-bar">
      <div className="filter-bar-top">
        <div className="filter-dropdown-container" ref={dropdownRef}>
          <button
            className={`filter-btn ${isDropdownOpen ? 'active' : ''}`}
            onClick={handleToggleDropdown}
          >
            <FilterIcon />
            <span>Filtros</span>
          </button>

          {isDropdownOpen && (
            <div className="filter-dropdown-menu">
              {!activeCategory ? (
                // View 1: Categories
                availableFilters.length > 0 ? (
                  availableFilters.map((category) => (
                    <div
                      key={category.id}
                      className="filter-dropdown-item category-item"
                      onClick={() => setActiveCategoryId(category.id)}
                    >
                      <span>{category.name}</span>
                      <span className="category-arrow">›</span>
                    </div>
                  ))
                ) : (
                  <div className="filter-dropdown-empty">No hay más filtros disponibles</div>
                )
              ) : (
                // View 2: Options within a category
                <div className="filter-options-view">
                  <div className="filter-options-header" onClick={() => setActiveCategoryId(null)}>
                    <BackIcon />
                    <span>{activeCategory.name}</span>
                  </div>
                  <div className="filter-options-list">
                    {activeCategory.options.map((option) => (
                      <div
                        key={option.id}
                        className="filter-dropdown-item option-item"
                        onClick={() => handleFilterSelect(activeCategory.name, option.label)}
                      >

                        <span className="option-label-col">{option.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="search-input-wrapper">
          <input
            type="text"
            placeholder="Ingrese valor"
            className="search-input"
            onChange={(e) => onSearch && onSearch(e.target.value)}
          />
          <SearchIcon />
        </div>
      </div>

      {appliedFilters.length > 0 && (
        <div className="applied-filters-container">
          {appliedFilters.map((filter, idx) => (
            <div key={idx} className="filter-chip">
              <span className="filter-chip-text">{filter}</span>
              <button
                className="filter-chip-close"
                onClick={() => onRemoveFilter && onRemoveFilter(filter)}
                aria-label={`Remove filter ${filter}`}
              >
                <CloseIcon />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
