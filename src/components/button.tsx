'use client';

type ButtonVariant =
  | 'primary'
  | 'outline'
  | 'ghost'
  | 'icon'
  | 'iconDanger'
  | 'chip'
  | 'plain';

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  ref?: React.Ref<HTMLButtonElement>;
};

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'btn btn-primary',
  outline: 'btn btn-outline',
  ghost: 'btn btn-ghost',
  icon: 'icon-btn',
  iconDanger: 'icon-btn icon-btn-danger',
  chip: 'chip active:scale-[0.97]',
  plain: '',
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

export function Button({ className, type = 'button', variant = 'plain', ref, ...props }: ButtonProps) {
  return (
    <button
      ref={ref}
      type={type}
      className={cx(variantClasses[variant], className)}
      {...props}
    />
  );
}
