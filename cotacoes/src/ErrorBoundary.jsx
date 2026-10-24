import { Component } from 'react'

// Uma falha de renderização não deve deixar a página silenciosamente vazia.
export default class ErrorBoundary extends Component {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() {
    if (!this.state.failed) return this.props.children
    return <main className="app" role="alert">
      <h1>Não foi possível exibir esta tela</h1>
      <p>Os dados não foram alterados. Tente novamente ou recarregue a página.</p>
      <button type="button" className="btn" onClick={() => this.setState({ failed: false })}>Tentar novamente</button>{' '}
      <button type="button" className="btn" onClick={() => window.location.reload()}>Recarregar</button>
    </main>
  }
}
