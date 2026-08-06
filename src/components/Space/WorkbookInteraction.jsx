import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, Link2, Palette } from 'lucide-react';
import { getInitialWorkbookInteractionResponse } from '../../utils/workbookInteractionUtils';

const stop = (event) => event.stopPropagation();

const GroupingInteraction = ({ config, value, onChange, disabled }) => {
  const [selectedItem, setSelectedItem] = useState('');
  const assigned = value && typeof value === 'object' ? value : {};
  const placeItem = (itemId, groupId) => {
    if (disabled || !itemId) return;
    onChange({ ...assigned, [itemId]: groupId });
    setSelectedItem('');
  };
  return (
    <div className="wb-interaction grouping-interaction" onClick={stop}>
      <div className="wb-item-bank">
        {config.items.map(item => (
          <button
            type="button"
            key={item.id}
            draggable={!disabled}
            className={`wb-drag-item ${selectedItem === item.id ? 'selected' : ''} ${assigned[item.id] ? 'assigned' : ''}`}
            onDragStart={(event) => event.dataTransfer.setData('text/plain', item.id)}
            onClick={() => !disabled && setSelectedItem(item.id)}
          >{item.label}</button>
        ))}
      </div>
      <div className="wb-group-zones">
        {config.groups.map(group => (
          <button
            type="button"
            key={group.id}
            className="wb-drop-zone"
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => { event.preventDefault(); placeItem(event.dataTransfer.getData('text/plain'), group.id); }}
            onClick={() => placeItem(selectedItem, group.id)}
            disabled={disabled}
          >
            <strong>{group.label}</strong>
            <span>{config.items.filter(item => assigned[item.id] === group.id).map(item => item.label).join(' ') || '여기에 놓기'}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

const NumberLineInteraction = ({ config, value, onChange, disabled }) => {
  const count = Math.round((config.max - config.min) / config.step);
  const ticks = Array.from({ length: count + 1 }, (_, index) => Number((config.min + index * config.step).toFixed(8)));
  return (
    <div className="wb-interaction number-line-interaction" onClick={stop}>
      <div className="wb-number-line-track" />
      <div className="wb-number-line-ticks">
        {ticks.map(tick => (
          <button type="button" key={tick} className={Number(value) === tick ? 'selected' : ''} onClick={() => !disabled && onChange(tick)} disabled={disabled}>
            <span className="tick-mark" />
            <span>{tick}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

const MatchingInteraction = ({ config, value, onChange, disabled }) => {
  const [selectedLeft, setSelectedLeft] = useState('');
  const pairs = value && typeof value === 'object' ? value : {};
  return (
    <div className="wb-interaction matching-interaction" onClick={stop}>
      <div className="wb-match-column">
        {config.leftItems.map(item => (
          <button type="button" key={item.id} className={selectedLeft === item.id ? 'selected' : ''} onClick={() => !disabled && setSelectedLeft(item.id)} disabled={disabled}>{item.label}</button>
        ))}
      </div>
      <Link2 className="wb-match-icon" size={22} />
      <div className="wb-match-column">
        {config.rightItems.map(item => (
          <button
            type="button"
            key={item.id}
            className={Object.values(pairs).includes(item.id) ? 'paired' : ''}
            onClick={() => {
              if (disabled || !selectedLeft) return;
              const next = Object.fromEntries(Object.entries(pairs).filter(([, rightId]) => rightId !== item.id));
              onChange({ ...next, [selectedLeft]: item.id });
              setSelectedLeft('');
            }}
            disabled={disabled}
          >{item.label}</button>
        ))}
      </div>
      <div className="wb-match-summary">
        {config.leftItems.map(left => {
          const right = config.rightItems.find(item => item.id === pairs[left.id]);
          return right ? <span key={left.id}>{left.label} ↔ {right.label}</span> : null;
        })}
      </div>
    </div>
  );
};

const OrderingInteraction = ({ config, value, onChange, disabled }) => {
  const order = Array.isArray(value) && value.length ? value : getInitialWorkbookInteractionResponse({ type: 'ordering', config });
  const move = (index, direction) => {
    const target = index + direction;
    if (disabled || target < 0 || target >= order.length) return;
    const next = [...order];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };
  const moveDragged = (draggedId, targetId) => {
    if (disabled || !draggedId || draggedId === targetId) return;
    const next = order.filter(id => id !== draggedId);
    next.splice(next.indexOf(targetId), 0, draggedId);
    onChange(next);
  };
  return (
    <div className="wb-interaction ordering-interaction" onClick={stop}>
      {order.map((id, index) => {
        const item = config.items.find(candidate => candidate.id === id);
        return (
          <div key={id} className="wb-order-item" draggable={!disabled} onDragStart={(event) => event.dataTransfer.setData('text/plain', id)} onDragOver={(event) => event.preventDefault()} onDrop={(event) => moveDragged(event.dataTransfer.getData('text/plain'), id)}>
            <span>{index + 1}. {item?.label || id}</span>
            <div>
              <button type="button" onClick={() => move(index, -1)} disabled={disabled || index === 0}><ArrowLeft size={15} /></button>
              <button type="button" onClick={() => move(index, 1)} disabled={disabled || index === order.length - 1}><ArrowRight size={15} /></button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

const ColoringInteraction = ({ config, value, onChange, disabled }) => {
  const [selectedColor, setSelectedColor] = useState(config.colors[0]?.id || '');
  const colored = value && typeof value === 'object' ? value : {};
  return (
    <div className="wb-interaction coloring-interaction" onClick={stop}>
      <div className="wb-color-palette">
        <Palette size={18} />
        {config.colors.map(color => (
          <button type="button" key={color.id} className={selectedColor === color.id ? 'selected' : ''} style={{ '--cell-color': color.value }} onClick={() => !disabled && setSelectedColor(color.id)} disabled={disabled} title={color.label}><span />{color.label}</button>
        ))}
      </div>
      <div className="wb-color-cells">
        {config.cells.map(cell => {
          const color = config.colors.find(item => item.id === colored[cell.id]);
          return <button type="button" key={cell.id} style={{ '--cell-color': color?.value || 'transparent' }} onClick={() => !disabled && selectedColor && onChange({ ...colored, [cell.id]: selectedColor })} disabled={disabled}>{cell.label}</button>;
        })}
      </div>
    </div>
  );
};

const WorkbookInteraction = ({ element, value, onChange, disabled = false }) => {
  const props = { config: element.config || {}, value, onChange, disabled };
  if (element.type === 'grouping') return <GroupingInteraction {...props} />;
  if (element.type === 'number-line') return <NumberLineInteraction {...props} />;
  if (element.type === 'matching') return <MatchingInteraction {...props} />;
  if (element.type === 'ordering') return <OrderingInteraction {...props} />;
  if (element.type === 'coloring') return <ColoringInteraction {...props} />;
  return null;
};

export default WorkbookInteraction;
