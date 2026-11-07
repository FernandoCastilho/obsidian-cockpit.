import studies from './studies.json'

export const SECTOR_STUDIES = studies
export function findSectorStudy(group, topicIndex) {
  return studies.find(study => study.group === group && study.topicIndex === topicIndex) || null
}
