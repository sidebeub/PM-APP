import React from 'react';
import { ViewMode } from 'gantt-task-react';

interface ViewSwitcherProps {
  onViewModeChange: (viewMode: ViewMode) => void;
  onViewListChange: (isChecked: boolean) => void;
  isChecked: boolean;
}

export const ViewSwitcher: React.FC<ViewSwitcherProps> = ({
  onViewModeChange,
  onViewListChange,
  isChecked
}) => {
  return (
    <div className="ViewContainer">
      <div className="ViewSwitcher">
        <button
          className="Button"
          onClick={() => onViewModeChange(ViewMode.Day)}
        >
          Day
        </button>
        <button
          className="Button"
          onClick={() => onViewModeChange(ViewMode.Week)}
        >
          Week
        </button>
        <button
          className="Button"
          onClick={() => onViewModeChange(ViewMode.Month)}
        >
          Month
        </button>
        <button
          className="Button"
          onClick={() => onViewModeChange(ViewMode.Year)}
        >
          Year
        </button>
      </div>
      <div className="ViewSwitcher">
        <label className="Switch">
          <input
            type="checkbox"
            checked={isChecked}
            onChange={() => onViewListChange(!isChecked)}
          />
          <span className="Slider round"></span>
        </label>
        <span>Show Task List</span>
      </div>
    </div>
  );
}; 