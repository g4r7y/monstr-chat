import { Accordion } from 'react-bootstrap';
import { useChatController } from '../chatControllerContext'

function Settings() {
  const controller = useChatController()
  return (
    <Accordion>
      <Accordion.Item eventKey="0">
        <Accordion.Header>Profile</Accordion.Header>
        <Accordion.Body>
          Your profile
        </Accordion.Body>
      </Accordion.Item>
      <Accordion.Item eventKey="1">
        <Accordion.Header>Relays</Accordion.Header>
        <Accordion.Body>
          Your relays list goes here...
        </Accordion.Body>
      </Accordion.Item>
      <Accordion.Item eventKey="2">
        <Accordion.Header>Keys</Accordion.Header>
        <Accordion.Body>
           {controller.getNpub()}
        </Accordion.Body>
      </Accordion.Item>
    </Accordion>
  )
}

export default Settings