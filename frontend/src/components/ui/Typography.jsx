const variants = {
  display: 'text-display-lg font-semibold tracking-tight text-foreground',
  title: 'text-title font-semibold text-foreground',
  body: 'text-body text-foreground/80',
  caption: 'text-caption text-muted',
};

function Typography({
  as: Element = 'p',
  children,
  className = '',
  variant = 'body',
  ...props
}) {
  return (
    <Element className={`${variants[variant]} ${className}`} {...props}>
      {children}
    </Element>
  );
}

export default Typography;
