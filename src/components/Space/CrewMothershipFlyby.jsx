import React from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '../../firebase'
import CrewMothership from './CrewMothership'
import { getCrewMothershipLevel } from '../../utils/crewMothershipCatalog'
import './CrewMothershipFlyby.css'

export default function CrewMothershipFlyby({ crewId }) {
  const [crew, setCrew] = React.useState(null)

  React.useEffect(() => {
    const resolvedCrewId = String(crewId || '').trim()
    setCrew(null)
    if (!resolvedCrewId) return undefined

    return onSnapshot(doc(db, 'crews', resolvedCrewId), (snapshot) => {
      setCrew(snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null)
    }, (error) => {
      console.warn('Crew mothership flyby sync failed:', error)
      setCrew(null)
    })
  }, [crewId])

  if (!crew || crew.status !== 'approved') return null

  const level = getCrewMothershipLevel(crew)
  return (
    <div
      className="crew-mothership-flyby"
      aria-label={`${crew.name || '스터디 크루'}의 ${level.name}이 항해 중입니다.`}
    >
      <div className="crew-mothership-flyby__vessel">
        <CrewMothership crew={crew} variant="map" />
        <div className="crew-mothership-flyby__signal font-tech">
          <span>MY CREW · LV.{level.level}</span>
          <strong>{crew.name || '스터디 크루'}</strong>
        </div>
      </div>
    </div>
  )
}
