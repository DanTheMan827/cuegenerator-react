import { useContext, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import _ from 'lodash';
import './Form.css';
import FormSelect from './Form/FormSelect';
import { formHandler } from '../Cue';
import { api, analytics, cueStorage } from '../Services';
import CounterContext from './CounterContext';
import { makeCueFileName } from '../Utils';
import { AnalyticsEvent } from '../Services/Analytics';
import { CueFormInputs } from '../types';

interface FORM_STATE_TYPE extends CueFormInputs {
  cue: string;
}

// type FORM_STATE_TYPE = {
//   performer: string;
//   title: string;
//   fileName: string;
//   fileType: string;
//   trackList: string;
//   regionsList: string;
//   cue: string;
// };

export default function Form() {
  const fileTypes = ['MP3', 'AAC', 'AIFF', 'ALAC', 'BINARY', 'FLAC', 'MOTOROLA', 'WAVE'];
  const FORM_INIT_STATE = {
    performer: '',
    title: '',
    fileName: '',
    fileType: fileTypes[0],
    trackList: '',
    regionsList: '',
    cue: '',
  };

  const [formState, setFormState] = useState<FORM_STATE_TYPE>(FORM_INIT_STATE);
  const [clientViewportHeight, setClientViewportHeight] = useState<number>(0);
  const [tracklistHeight, setTracklistHeight] = useState<string | number>('auto');
  const [cueHeight, setCueHeight] = useState<string | number>('auto');
  const [isLoadCueButtonVisible, setLoadCueButtonVisible] = useState<boolean>(false);
  const { setCounter } = useContext(CounterContext);

  useEffect(() => {
    setClientViewportHeight(window.innerHeight);
    setTracklistHeight(clientViewportHeight - 20 - 375);
    setCueHeight(clientViewportHeight - 20 - 173);
  }, [clientViewportHeight]);
  useEffect(() => {
    setLoadCueButtonVisible(cueStorage.hasPrevCue());
  }, []);

  const anyInputOnChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const name = event.target.name;
    const value = event.target.value || '';
    const preUpdatedState = { ...formState, ...{ [name]: value } };

    const { performer, title, fileName, fileType, trackList, regionsList } = preUpdatedState;
    const cue = formHandler.createCue(performer, title, fileName, fileType, trackList, regionsList);
    const updatedState = { ...preUpdatedState, ...{ cue } };

    setFormState(updatedState);
  };
  const cueOnFocusHandler = _.once((event: any) => event.target.select());
  const saveButtonOnClick = async (event: React.FormEvent<HTMLInputElement>) => {
    if (!formState.cue) return;
    bumpCueCounter();
    saveCueAsFile();
    analytics.logEvent(AnalyticsEvent.CUE_FILE_SAVED);

    const { performer, title, fileName, fileType, trackList, regionsList } = formState;
    cueStorage.setPrevCue({ performer, title, fileName, fileType, trackList, regionsList });
    setLoadCueButtonVisible(cueStorage.hasPrevCue());
  };
  const bumpCueCounter = async () => {
    const { performer, title, fileName, cue } = formState;
    const counter = await api.bumpCounter(performer, title, fileName, cue);
    if (counter) setCounter(counter);
  };
  const saveCueAsFile = () => {
    const blob = new Blob([formState.cue], { type: 'octet/stream' });
    let url = window.URL.createObjectURL(blob);
    let a = document.createElement('a');
    a.href = url;
    a.download = makeCueFileName(formState.fileName);
    a.click();
  };
  const loadButtonOnClick = async (event: React.FormEvent<HTMLInputElement>) => {
    const prevCue = cueStorage.getPrevCue();
    if (prevCue) {
      const { performer, title, fileName, fileType, trackList, regionsList } = prevCue;
      const cue = formHandler.createCue(performer, title, fileName, fileType, trackList, regionsList);
      const updatedState = { ...formState, ...prevCue, ...{ cue } };
      setFormState(updatedState);
    }

    analytics.logEvent(AnalyticsEvent.PREV_CUE_LOADED);
  };

  return (
    <form>
      <input
        type="button"
        name="save"
        className="form-button save-button"
        value="Save Cue to File"
        onClick={saveButtonOnClick}
      />
      {isLoadCueButtonVisible && (
        <input
          type="button"
          name="load"
          className="form-button load-button form-button-margin"
          value="Load my prev Cue"
          onClick={loadButtonOnClick}
        />
      )}
      <div className="clear"></div>

      <div id="cue_fields">
        <div className="field">
          <label>Performer:</label>
          <input
            tabIndex={1}
            autoComplete="off"
            type="text"
            onChange={anyInputOnChange}
            name="performer"
            value={formState.performer}
          />
        </div>
        <div className="field">
          <label>Title:</label>
          <input
            tabIndex={2}
            autoComplete="off"
            type="text"
            onChange={anyInputOnChange}
            name="title"
            value={formState.title}
          />
        </div>
        <div className="field">
          <label htmlFor="filename">File name:</label>
          <input
            tabIndex={3}
            autoComplete="off"
            type="text"
            onChange={anyInputOnChange}
            name="fileName"
            value={formState.fileName}
          />
        </div>
        <div className="field">
          <label>File type:</label>
          {FormSelect(fileTypes, 'fileType', formState.fileType, anyInputOnChange, 4)}
        </div>
        <div className="field">
          <label>Tracklist:</label>
          <textarea
            tabIndex={5}
            rows={5}
            cols={10}
            style={{ height: tracklistHeight }}
            id="tracklist"
            name="trackList"
            onChange={anyInputOnChange}
            value={formState.trackList}
          ></textarea>
        </div>
        <div className="field">
          <label>
            Timings:{' '}
            <sup>
              <Link to="/help" target="new">
                Help
              </Link>
            </sup>
          </label>
          <textarea
            tabIndex={6}
            rows={5}
            cols={10}
            id="regions_list"
            name="regionsList"
            onChange={anyInputOnChange}
            value={formState.regionsList}
          ></textarea>
        </div>
      </div>
      <div id="cue_ready">
        <input type="hidden" name="generate" id="generate" />
        <textarea
          id="cue"
          rows={5}
          cols={10}
          readOnly={true}
          style={{
            backgroundImage: `url("/images/read-only.gif")`,
            height: cueHeight,
          }}
          value={formState.cue}
          onFocus={cueOnFocusHandler}
        ></textarea>
      </div>
    </form>
  );
}
