import React, { useEffect, useState } from 'react';
import { ArrowLeft, Loader2, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { isTugLicenseVerified, verifyTugLicense } from '../components/TugOfWarLicenseManager';
import './AdventureGameStyles.css';

const ADVENTURE_LICENSE_CONFIG = {
  licensePrefix: 'DMX',
  storagePrefix: 'dmx',
  deviceInfo: 'Adventure Game',
};

type AdventureLicenseGateProps = {
  children: React.ReactNode;
};

const AdventureLicenseGate: React.FC<AdventureLicenseGateProps> = ({ children }) => {
  const navigate = useNavigate();
  const [isVerified, setIsVerified] = useState<boolean | null>(null);
  const [licenseInput, setLicenseInput] = useState('');
  const [error, setError] = useState('');
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    setIsVerified(isTugLicenseVerified(ADVENTURE_LICENSE_CONFIG));
  }, []);

  const handleVerify = async () => {
    if (!licenseInput.trim()) {
      setError('请输入奖惩大冒险授权码');
      return;
    }

    setIsChecking(true);
    setError('');

    const result = await verifyTugLicense(ADVENTURE_LICENSE_CONFIG, licenseInput);
    if (result.success) {
      setIsVerified(true);
      setLicenseInput('');
    } else {
      setError(result.message || '授权码验证失败');
    }

    setIsChecking(false);
  };

  if (isVerified === null) {
    return (
      <div className="couple-game-app">
        <div className="adventure-license-panel">
          <Loader2 className="adventure-license-spinner" size={36} />
          <strong>正在检查授权...</strong>
        </div>
      </div>
    );
  }

  if (isVerified) return <>{children}</>;

  return (
    <div className="couple-game-app">
      <button
        type="button"
        onClick={() => navigate('/')}
        className="adventure-license-back"
        aria-label="返回首页"
      >
        <ArrowLeft size={22} />
      </button>

      <div className="couple-game-main-container adventure-license-card">
        <div className="adventure-license-icon">
          <Lock size={34} />
        </div>
        <h1>奖惩大冒险</h1>
        <p className="adventure-license-copy">请输入 DMX 授权码后开始使用。</p>

        <label className="adventure-license-label" htmlFor="adventure-license-input">
          授权码
        </label>
        <div className="adventure-license-input-row">
          <span aria-hidden="true">DMX</span>
          <input
            id="adventure-license-input"
            type="text"
            value={licenseInput}
            onChange={(event) => setLicenseInput(event.target.value.toUpperCase())}
            onKeyDown={(event) => { if (event.key === 'Enter') handleVerify(); }}
            placeholder="DMX-20260522-ABC123"
            autoComplete="off"
          />
        </div>

        {error && <p className="adventure-license-error">{error}</p>}

        <button
          type="button"
          className="couple-game-generate-btn adventure-license-submit"
          onClick={handleVerify}
          disabled={isChecking || !licenseInput.trim()}
        >
          {isChecking ? '验证中...' : '验证授权码'}
        </button>
      </div>
    </div>
  );
};

export default AdventureLicenseGate;
