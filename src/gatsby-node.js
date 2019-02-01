const FootballData = require('football-data-v2')

const teams = require('./teams.js')

exports.sourceNodes = async (
  { actions, createNodeId, createContentDigest },
  { apiKey, teamId, competitionId }
) => {
  const { createNode } = actions

  const processNode = ({type, id, content, parent=null, children=[]}) => {
    const nodeId = createNodeId(`${type}-${id}`)
    const nodeContent = JSON.stringify(content)
    const nodeData = Object.assign({}, content, {
      id: nodeId,
      parent,
      children,
      internal: {
        type,
        content: nodeContent,
        contentDigest: createContentDigest(content),
      },
    })
    return nodeData
  }

  const footballData = new FootballData(apiKey)

  try {
    const dataMatches = await footballData.teamMatches(teamId, {})
    const matches = dataMatches.data
    const dataStandings = await footballData.standings(competitionId, {})
    const standings = dataStandings.data
    const currentCompetition = standings.competition
    const currentSeason = standings.season
    const aCompetitions = {}
    const aSeasons = {}

    const nodeCurrentCompetition = processNode({
      type: 'FootCompetition',
      id: currentCompetition.id,
      content: currentCompetition
    })
    createNode(nodeCurrentCompetition)
    aCompetitions[currentCompetition.id] = nodeCurrentCompetition.id

    const nodeCurrentSeason = processNode({
      type: 'FootSeason',
      id: currentSeason.id,
      content: currentSeason
    })
    createNode(nodeCurrentSeason)
    aSeasons[nodeCurrentSeason.id] = nodeCurrentSeason.id

    standings.standings.map( standing => {
      let label = null
      switch (standing.type) {
        case 'TOTAL':
          label = 'Total'
          break
        case 'HOME':
          label = 'Home'
          break
        case 'AWAY':
          label = 'Away'
          break
      }

      standing.table.map ( rank => {
        const nodeStanding = processNode({
          type: `FootStanding${label}`,
          id: rank.position,
          content: rank
        })
        
        nodeStanding.competition___NODE = nodeCurrentCompetition.id
        nodeStanding.season___NODE = nodeCurrentSeason.id
  
        createNode(nodeStanding)
      })      
    })

    matches.matches.map( match => {
      if (match.status == 'SCHEDULED') {
        delete match.score
      }
      match.homeTeam.surname = teams[match.homeTeam.id]
      match.awayTeam.surname = teams[match.awayTeam.id]

      if (aCompetitions[match.competition.id] === undefined) {
        const nodeCompetition = processNode({
          type: 'FootCompetition',
          id: match.competition.id,
          content: match.competition
        })
        createNode(nodeCompetition)
        aCompetitions[match.competition.id] = nodeCompetition.id
      }
      const competitionNodeId = aCompetitions[match.competition.id]

      if (aSeasons[match.season.id] === undefined) {
        const nodeSeason = processNode({
          type: 'FootSeason',
          id: match.season.id,
          content: match.season
        })
        createNode(nodeSeason)
        aSeasons[match.season.id] = nodeSeason.id
      }
      const seasonNodeId = aSeasons[match.season.id]


      const nodeData = processNode({
        type: `FootMatch`,
        id: match.id,
        content: match
      })
      
      nodeData.competition___NODE = competitionNodeId
      nodeData.season___NODE = seasonNodeId

      createNode(nodeData)
    })


  } catch (err) {
    console.error(err)
    process.exit(1)
  }

}