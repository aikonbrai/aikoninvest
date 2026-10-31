import PortfolioLab from './portfolio-lab';
import { demo, DEMO_DATE } from '../lib/demo';
import { evaluate } from '../lib/ledger';

export default function Home() {
  return <PortfolioLab initialSimulation={demo} initialReport={evaluate(demo, DEMO_DATE).report} />;
}
