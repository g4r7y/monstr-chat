interface KeyStore {

  readKey() : Promise<string | null>;

  writeKey(keyStr: string) : void;

}
  
export default KeyStore