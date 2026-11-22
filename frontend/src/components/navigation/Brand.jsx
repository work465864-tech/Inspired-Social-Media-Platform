import { Logo } from '../common/Logo';

function Brand({ compact = false }) {
  return <Logo showWordmark={!compact} />;
}

export default Brand;
