import http from '@/utils/http'

const TOKEN_STORAGE_ITEM = 'polyphona-token'
const USER_STORAGE_ITEM = 'polyphona-user'

const getters = {
  getUser: (state) => state.user
}

const mutations = {
  setUser (state, user) {
    localStorage.setItem(USER_STORAGE_ITEM, JSON.stringify(user))
    state.user = user
  },
  setToken (state, token) {
    localStorage.setItem(TOKEN_STORAGE_ITEM, token)
    state.token = token
  },
  discardToken (state) {
    localStorage.removeItem(TOKEN_STORAGE_ITEM)
  }
}

const actions = {
  async register (context, {username, firstName, lastName, password}) {
    const payload = {username, first_name: firstName, last_name: lastName, password}
    await http.post('/users/', payload)
    await context.dispatch('login', {username, password})
  },
  login (context, {username, password}) {
    return http.post('/tokens/', {username, password}).then((resp) => {
      const {token, user} = resp.data()
      context.commit('setToken', token)
      context.commit('setUser', user)
    })
  },
  logout (context) {
    context.commit('discardToken')
  }
}

// Initial state
const rawUser = localStorage.getItem(USER_STORAGE_ITEM)
const state = {
  user: rawUser ? JSON.parse(rawUser) : null,
  token: localStorage.getItem(TOKEN_STORAGE_ITEM)
}

export default {namespaced: true, getters, actions, mutations, state}