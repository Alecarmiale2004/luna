import { render } from 'preact'
import '@fontsource-variable/inter/opsz.css'
import './styles/tokens.css'
import './styles/base.css'
import './styles/components.css'
import { App } from './App.jsx'

render(<App />, document.getElementById('app'))
