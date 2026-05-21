import { useParams } from 'react-router-dom'

export default function Result() {
  const { jobId } = useParams()
  return (
    <section>
      <h1 className="text-2xl font-semibold mb-2">Result</h1>
      <p className="text-neutral-600">
        Job ID from URL: <code>{jobId}</code>. The PresetSheet (predicted LT25 knob
        values) will render here once the backend job completes.
      </p>
    </section>
  )
}
