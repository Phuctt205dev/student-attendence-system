import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, Camera, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import Button from './Button';

const QRScanner = ({ isOpen, onClose, onScanSuccess, studentId, studentName }) => {
  const scannerRef = useRef(null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    let html5QrCode;

    const startScanner = async () => {
      try {
        setError('');
        setSuccess('');

        html5QrCode = new Html5Qrcode('qr-reader');

        const config = {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0
        };

        await html5QrCode.start(
          { facingMode: 'environment' }, // Use back camera
          config,
          async (decodedText) => {
            if (processing) return; // Prevent multiple scans

            setProcessing(true);
            try {
              // Parse QR data
              const qrData = JSON.parse(decodedText);

              // Validate QR structure
              if (!qrData.attendanceId || !qrData.timestamp) {
                throw new Error('QR code không hợp lệ');
              }

              // Check if QR is expired (compare with current time)
              // Note: The backend will also validate expiry
              const now = Date.now();
              if (qrData.expiry && now > qrData.expiry) {
                throw new Error('QR code đã hết hạn');
              }

              // Stop scanner before processing
              await html5QrCode.stop();
              setScanning(false);

              // Call the success handler with QR data and student info
              await onScanSuccess({
                attendanceId: qrData.attendanceId,
                studentId,
                studentName
              });

              setSuccess('Điểm danh thành công!');

              // Close modal after 2 seconds
              setTimeout(() => {
                onClose();
              }, 2000);

            } catch (err) {
              setError(err.message || 'Có lỗi xảy ra khi xử lý QR code');
              setProcessing(false);
            }
          },
          (errorMessage) => {
            // Scanning error - ignore, just keep scanning
          }
        );

        setScanning(true);
      } catch (err) {
        console.error('Scanner error:', err);
        setError('Không thể khởi động camera. Vui lòng kiểm tra quyền truy cập camera.');
      }
    };

    startScanner();

    // Cleanup
    return () => {
      if (html5QrCode && scanning) {
        html5QrCode.stop().catch(console.error);
      }
    };
  }, [isOpen, onScanSuccess, studentId, studentName, processing, scanning]);

  const handleClose = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
      } catch (err) {
        console.error('Error stopping scanner:', err);
      }
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-primary-600" />
            <h3 className="text-lg font-semibold text-gray-900">Quét mã QR điểm danh</h3>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={processing}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Success Message */}
          {success && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
              <p className="text-sm text-green-700 font-medium">{success}</p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
              <XCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Scanner */}
          {!success && (
            <>
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-700">
                  <p className="font-medium mb-1">Hướng dẫn:</p>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>Đưa camera đến mã QR của giảng viên</li>
                    <li>Giữ camera ổn định để quét</li>
                    <li>Mỗi sinh viên chỉ được điểm danh 1 lần</li>
                  </ul>
                </div>
              </div>

              {/* QR Reader Container */}
              <div className="relative">
                <div
                  id="qr-reader"
                  className="w-full rounded-lg overflow-hidden border-2 border-gray-300"
                  style={{ minHeight: '300px' }}
                />

                {processing && (
                  <div className="absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-3" />
                      <p className="text-sm text-gray-600">Đang xử lý...</p>
                    </div>
                  </div>
                )}
              </div>

              {scanning && !processing && (
                <div className="mt-3 text-center">
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    Đang quét...
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!success && (
          <div className="p-4 border-t">
            <Button
              variant="outline"
              fullWidth
              onClick={handleClose}
              disabled={processing}
            >
              Đóng
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default QRScanner;
