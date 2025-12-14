import React, { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4 font-['Sarabun']">
          <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center border border-gray-100 animate-fade-in">
            <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
              <AlertTriangle size={40} />
            </div>
            <h1 className="text-2xl font-bold font-['Mitr'] text-gray-800 mb-2">เกิดข้อผิดพลาดบางอย่าง</h1>
            <p className="text-gray-500 mb-6 text-sm">
              ขออภัยในความไม่สะดวก ระบบเกิดข้อผิดพลาดที่ไม่คาดคิด<br/>
              <span className="text-xs text-gray-400 mt-2 block break-words bg-gray-50 p-2 rounded border border-gray-100 font-mono">
                {this.state.error?.message || 'Unknown Error'}
              </span>
            </p>
            <button
              onClick={() => window.location.reload()}
              className="bg-accent text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:bg-orange-400 transition-all flex items-center justify-center gap-2 w-full"
            >
              <RefreshCw size={20} /> รีโหลดหน้าเว็บ
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}