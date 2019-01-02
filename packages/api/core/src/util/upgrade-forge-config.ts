import {
  ForgeConfig,
  ForgePlatform,
  IForgeResolvableMaker,
  IForgeResolvablePublisher
} from '@electron-forge/shared-types';
import path from 'path';
import { siblingDep } from '../api/init-scripts/init-npm';

function mapMakeTargets(forge5Config: any): Map<string, ForgePlatform[]> {
  const makeTargets = new Map<string, ForgePlatform[]>();
  if (forge5Config.makeTargets) {
    for (const [platform, targets] of forge5Config.makeTargets.entries()) {
      for (const target of targets) {
        let platforms = makeTargets.get(target)
        if (platforms === undefined) {
          platforms = [];
          makeTargets.set(target, platforms);
        }
        platforms.push(platform as ForgePlatform);
      }
    }
  }

  return makeTargets;
}

const forge5MakerMappings = new Map<string, string>([
  ['electronInstallerDebian', 'deb'],
  ['electronInstallerDMG', 'dmg'],
  ['electronInstallerFlatpak', 'flatpak'],
  ['electronInstallerRedhat', 'rpm'],
  ['electronInstallerSnap', 'snap'],
  ['electronWinstallerConfig', 'squirrel'],
  ['electronWixMSIConfig', 'wix'],
  ['windowsStoreConfig', 'appx']
]);

/**
 * Converts Forge v5 maker config to v6.
 */
function generateForgeMakerConfig(forge5Config: any): IForgeResolvableMaker[] {
  const makeTargets = mapMakeTargets(forge5Config);
  const makers: IForgeResolvableMaker[] = [];

  for (const [forge5Key, makerType] of forge5MakerMappings) {
    const config = forge5Config[forge5Key];
    if (config) {
      makers.push({
        name: `@electron-forge/maker-${makerType}`,
        config: forge5Config[forge5Key],
        platforms: makeTargets.get(makerType) || null
      } as IForgeResolvableMaker);
    }
  }

  const zipPlatforms = makeTargets.get('zip');
  if (zipPlatforms) {
    makers.push({
      name: '@electron-forge/maker-zip',
      platforms: zipPlatforms
    } as IForgeResolvableMaker)
  }

  return makers;
}

const forge5PublisherMappings = new Map<string, string>([
  ['github_repository', 'github'],
  ['s3', 's3'],
  ['electron-release-server', 'electron-release-server'],
  ['snapStore', 'snapcraft']
]);

/**
 * Converts Forge v5 publisher config to v6.
 */
function generateForgePublisherConfig(forge5Config: any): IForgeResolvablePublisher[] {
  const publishers: IForgeResolvablePublisher[] = [];

  for (const [forge5Key, publisherType] of forge5PublisherMappings) {
    let config = forge5Config[forge5Key];
    if (config) {
      if (publisherType === 'github') {
        config = transformGitHubPublisherConfig(config);
      }
      publishers.push({
        name: `@electron-forge/publisher-${publisherType}`,
        config: config,
        platforms: null
      } as IForgeResolvableMaker);
    }
  }

  return publishers;
}

/**
 * Transforms v5 GitHub publisher config to v6 syntax.
 */
function transformGitHubPublisherConfig (config: any) {
  const { name, owner, options, ...gitHubConfig } = config;
  gitHubConfig.repository = { name, owner };
  if (options) {
    gitHubConfig.octokitOptions = options;
  }

  return gitHubConfig;
}

/**
 * Upgrades Forge v5 config to v6.
 */
export default function upgradeForgeConfig (forge5Config: any): ForgeConfig {
  const forgeConfig: ForgeConfig = ({} as ForgeConfig);

  if (forge5Config.electronPackagerConfig) {
    delete forge5Config.electronPackagerConfig.packageManager;
    forgeConfig.packagerConfig = forge5Config.electronPackagerConfig;
  }
  if (forge5Config.electronRebuildConfig) {
    forgeConfig.electronRebuildConfig = forge5Config.electronRebuildConfig;
  }
  forgeConfig.makers = generateForgeMakerConfig(forge5Config);
  forgeConfig.publishers = generateForgePublisherConfig(forge5Config);

  return forgeConfig;
}

export function updateUpgradedForgeDevDeps (packageJSON: any, devDeps: string[]): string[] {
  const forgeConfig = packageJSON.config.forge;
  devDeps = devDeps.filter(dep => dep.startsWith('@electron-forge/maker-'));
  devDeps = devDeps.concat(forgeConfig.makers.map((maker: IForgeResolvableMaker) => siblingDep(path.basename(maker.name))));
  devDeps = devDeps.concat(forgeConfig.publishers.map((publisher: IForgeResolvablePublisher) => siblingDep(path.basename(publisher.name))));

  if (Object.keys(packageJSON.devDependencies).find((dep: string) => dep === 'electron-prebuilt-compile')) {
    devDeps = devDeps.concat(siblingDep('plugin-compile'));
  }

  return devDeps;
}
