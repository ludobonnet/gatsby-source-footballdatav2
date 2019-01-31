const FootballData = require('football-data-v2')

const teams = require('./teams.js')

exports.sourceNodes = (
  { actions, createNodeId, createContentDigest },
  { apiKey, teamId, competitionId }
) => {
  const { createNode } = actions

  const footballData = new FootballData(apiKey)

  let lastMatch = {}
  let nextMatch = null

  const processMatch = match => {
    if (match.status == 'SCHEDULED') {
      delete match.score
    }

    match.homeTeam.surname = teams[match.homeTeam.id]
    match.awayTeam.surname = teams[match.awayTeam.id]


    const nodeId = createNodeId(`footballdata-m-${match.id}`)
    const nodeContent = JSON.stringify(match)
    const nodeData = Object.assign({}, match, {
      id: nodeId,
      parent: null,
      children: [],
      internal: {
        type: `FootMatch`,
        content: nodeContent,
        contentDigest: createContentDigest(match),
      },
    })

    return nodeData
  }

  const processStanding = standing => {
    standing.team.surname = teams[standing.team.id]
    const nodeId = createNodeId(`footballdata-s-${standing.position}`)
    const nodeContent = JSON.stringify(standing)
    const nodeData = Object.assign({}, standing, {
      id: nodeId,
      parent: null,
      children: [],
      internal: {
        type: `FootStanding`,
        content: nodeContent,
        contentDigest: createContentDigest(standing),
      },
    })

    return nodeData
  }

  return new Promise((resolve, reject) => {
    footballData.teamMatches(teamId, {}).then(res => {
      res.data.matches.map( match => {
        const nodeData = processMatch(match)
        createNode(nodeData)
      })
    
      footballData.standings(competitionId, {standingType: "TOTAL"}).then(res => {
        res.data.standings[0].table.map( standing => {
          const nodeData = processStanding(standing)
          createNode(nodeData)
        })
        resolve()
      }).catch(e => {
        reject(e)
      })
      
    }).catch(e => {
      reject(e)
    })      
  })
}