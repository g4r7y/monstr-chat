import { Accordion, ListGroup, ListGroupItem } from 'react-bootstrap';
import { useChatController } from '../chatControllerContext';
import UserProfile from './UserProfile';
import Relays from './Relays';
import React from 'react';
import type { AccordionEventKey } from 'react-bootstrap/esm/AccordionContext';
import { useAppView, type AppViewNameType } from '../appViewContext';

type SettingsProps = {
  activeKey: string;
};

function Settings(props: SettingsProps) {
  const controller = useChatController();

  const [activeKey, setActiveKey] = React.useState<AccordionEventKey>(props.activeKey);
  const { switchView } = useAppView();

  const handleSwitchAccordion = (key: AccordionEventKey) => {
    setActiveKey(key);
    if (key) {
      switchView(`settings#${key}` as AppViewNameType);
    }
  };

  return (
    <Accordion activeKey={activeKey} onSelect={handleSwitchAccordion}>
      <Accordion.Item eventKey="profile">
        <Accordion.Header>Profile</Accordion.Header>
        <Accordion.Body>
          <UserProfile />
        </Accordion.Body>
      </Accordion.Item>
      <Accordion.Item eventKey="relays">
        <Accordion.Header>Relays</Accordion.Header>
        <Accordion.Body>
          <Relays />
        </Accordion.Body>
      </Accordion.Item>
      <Accordion.Item eventKey="keys">
        <Accordion.Header>Keys</Accordion.Header>
        <Accordion.Body>
          <div>
            <div className="row mb-2">Your public key (npub):</div>
            <ListGroup className="mb-3">
              <ListGroupItem className="list-group-item-secondary text-break">{controller.getNpub()}</ListGroupItem>
            </ListGroup>
          </div>
        </Accordion.Body>
      </Accordion.Item>
    </Accordion>
  );
}

export default Settings;
