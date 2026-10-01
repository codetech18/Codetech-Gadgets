interface ToastProps {
  message: string;
  visible: boolean;
}

export default function Toast({ message, visible }: ToastProps) {
  return (
    <div className={`fixed bottom-6 right-6 left-6 sm:left-auto sm:max-w-sm z-[999] bg-blue-950 text-white 
                    px-5 py-3 rounded-xl font-semibold text-sm shadow-[0_12px_40px_rgba(37,99,235,0.18)]
                    transition-all duration-300 text-center sm:text-left
                    ${visible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0 pointer-events-none'}`}>
      {message}
    </div>
  );
}
