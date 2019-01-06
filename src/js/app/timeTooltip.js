import './jquery.balloon.min';

const className = 'time-tooltip';

export const setTimeTooltip = ($element, contents) => {
  return $element.balloon({
    contents,
    classname: className,
    showDuration: 64,
    minLifetime: 0,
    tipSize: 4,
    showAnimation(d, c) { this.fadeIn(d, c); },
    css: {
      backgroundColor: '#f7f7f7',
      color: '#636363',
      boxShadow: '0',
      opacity: 1,
    },
  });
};

export const removeAllTimeTooltips = () => {
  $(`.${className}`).remove();
};