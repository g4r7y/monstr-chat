import { Accordion, Button, ListGroup, ListGroupItem } from 'react-bootstrap';
import { useChatController } from '../chatControllerContext';
import UserProfile from './UserProfile';
import Relays from './Relays';
import NotificationSettings from './NotificationSettings';
import React from 'react';
import type { AccordionEventKey } from 'react-bootstrap/esm/AccordionContext';
import { useAppView, type AppViewNameType } from '../appViewContext';

type SettingsProps = {
  activeKey: string;
};

function Settings(props: SettingsProps) {
  const controller = useChatController();

  const [activeKey, setActiveKey] = React.useState<AccordionEventKey>(props.activeKey);
  const [showNsec, setShowNsec] = React.useState(false);
  const { switchView } = useAppView();

  const handleSwitchAccordion = (key: AccordionEventKey) => {
    setActiveKey(key);
    if (key) {
      switchView(`settings#${key}` as AppViewNameType);
    }
  };

  const handleToggleNsec = () => {
    setShowNsec((prev) => !prev);
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
            <div className="row mb-2">Your public key:</div>
            <ListGroup className="mb-3">
              <ListGroupItem className="list-group-item-secondary text-break">{controller.getNpub()}</ListGroupItem>
            </ListGroup>
          </div>
          <div>
            <div className="row mb-2 d-flex align-items-center justify-content-between gx-0">Your secret key:</div>
            <ListGroup className="mb-3">
              <ListGroupItem className="list-group-item-secondary d-flex align-items-center justify-content-between gap-2">
                <div className="text-break">{showNsec ? controller.getNsec() : '*'.repeat(controller.getNsec().length)}</div>
                <Button
                  variant="link"
                  size="sm"
                  className="p-0 text-decoration-none"
                  onClick={handleToggleNsec}
                  aria-label={showNsec ? 'Hide secret key' : 'Show secret key'}
                  aria-pressed={showNsec}
                >
                  <i className={`fas ${showNsec ? 'fa-eye-slash' : 'fa-eye'}`} aria-hidden="true"></i>
                </Button>
              </ListGroupItem>
            </ListGroup>
          </div>
        </Accordion.Body>
      </Accordion.Item>
      <Accordion.Item eventKey="notifications">
        <Accordion.Header>Notifications</Accordion.Header>
        <Accordion.Body>
          <NotificationSettings />
        </Accordion.Body>
      </Accordion.Item>
    </Accordion>
  );
}

export default Settings;
