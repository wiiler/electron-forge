import { IForgeResolvablePublisher } from '@electron-forge/shared-types';
import { expect } from 'chai';
import path from 'path';

import upgradeForgeConfig from '../../src/util/upgrade-forge-config';

describe.only('upgradeForgeConfig', () => {
  it('converts GitHub publisher config', () => {
    const octokitOptions = {
      timeout: 0
    };
    const repo = {
        name: 'myapp',
        owner: 'user'
      }
    const oldConfig = {
      github_repository: Object.assign({
        options: octokitOptions,
        draft: true
      }, repo)
    };
    const newConfig = upgradeForgeConfig(oldConfig);
    expect(newConfig.publishers).to.have.lengthOf(1);
    const publisherConfig = (newConfig.publishers[0] as IForgeResolvablePublisher).config;
    expect(publisherConfig.repository).to.deep.equal(repo);
    expect(publisherConfig.octokitOptions).to.deep.equal(octokitOptions);
    expect(publisherConfig.draft).to.equal(true);
  });
});
