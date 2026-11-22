function Container({
  as: Element = 'div',
  children,
  className = '',
  ...props
}) {
  return (
    <Element
      className={`mx-auto w-full max-w-6xl px-4 xs:px-5 sm:px-6 lg:px-8 ${className}`}
      {...props}
    >
      {children}
    </Element>
  );
}

export default Container;
